// Flurry the talking snowman -- firmware for the Adafruit ESP32-S3 Feather (4MB flash, 2MB PSRAM, #5477).
// Hold the belly button and talk, then let go. The board sends the recording to qourlite.xyz/api/snowman,
// the projector page (qourlite.xyz/snowman/) plays the answer through the room speakers, and the LED mouth
// moves along. With SPEAK_ON_BOARD the snowman plays the answer on its own small speaker instead.
//
// Arduino IDE: board package "esp32 by Espressif" 3.x, board "Adafruit Feather ESP32-S3 2MB PSRAM".
// Libraries: "Adafruit NeoPixel" and "ArduinoJson" (7.x).
// Copy secrets.example.h to secrets.h and fill it in. Wiring: see ../README.md.
#include <WiFi.h>
#include <WiFiMulti.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ESP_I2S.h>
#include <Adafruit_NeoPixel.h>
#include <ArduinoJson.h>
#include "secrets.h"

// Pins, with the label printed on the Feather
const int PIN_BUTTON   = 5;   // D5   button, other leg to GND
const int PIN_RING     = 6;   // D6   LED ring DIN
const int PIN_MIC_CLK  = 9;   // D9   mic CLK
const int PIN_MIC_DAT  = 10;  // D10  mic DAT
const int PIN_SPK_BCLK = 18;  // A0   amp BCLK
const int PIN_SPK_LRC  = 17;  // A1   amp LRC
const int PIN_SPK_DIN  = 16;  // A2   amp DIN

const bool SPEAK_ON_BOARD = false;  // true: answer plays on the snowman's speaker (no PA, no projector sound)
const int  RATE = 16000;            // mic sample rate
const int  MAX_SEC = 8;             // longest question
const int  MIC_GAIN = 4;            // raise if transcripts come back empty, lower if they sound distorted
const int  LAG_MS = 2500;           // projector delay before it starts speaking; tune at rehearsal
const char *URL = "https://qourlite.xyz/api/snowman";

Adafruit_NeoPixel ring(12, PIN_RING, NEO_GRB + NEO_KHZ800);
WiFiMulti wifi;
I2SClass mic, spk;
int16_t *rec;  // 44-byte WAV header + samples, in PSRAM

enum Mode { BOOT, IDLE, LISTEN, THINK, TALK, OOPS };
volatile Mode mode = BOOT;
volatile uint32_t talkFrom = 0, talkUntil = 0;

uint32_t tint(int r, int g, int b, float k) { return ring.Color(r * k, g * k, b * k); }

// Mouth animation on its own task, so it keeps moving while the board waits on the network.
void ledTask(void *) {
  for (uint32_t t = 0;; t += 30, vTaskDelay(pdMS_TO_TICKS(30))) {
    uint32_t now = millis();
    if (mode == TALK && now > talkUntil) mode = IDLE;
    bool talking = mode == TALK && now >= talkFrom;
    int open = talking ? 1 + (esp_random() % 6) : 0;  // how far the mouth opens, 1..6 pixels each side
    if (talking && t % 120) open = -1;                // hold each mouth shape for about 120 ms
    if (open == -1) continue;
    for (int i = 0; i < 12; i++) {
      int d = min(i, 12 - i);  // distance from pixel 0, so the mouth opens symmetrically
      uint32_t c = 0;
      switch (mode) {
        case BOOT:   c = (i == (t / 90) % 12) ? tint(0, 80, 255, 0.5) : 0; break;
        case IDLE:   c = tint(249, 99, 2, 0.08 + 0.06 * sin(t / 700.0)); break;
        case LISTEN: c = tint(47, 179, 107, 1.0); break;
        case OOPS:   c = tint(255, 0, 0, (t / 200) % 2 ? 0.6 : 0.1); break;
        case THINK:
        case TALK:
          if (talking) c = d < open ? tint(249, 99, 2, 1.0) : 0;
          else c = (i == (t / 60) % 12 || i == (t / 60 + 6) % 12) ? tint(249, 99, 2, 1.0) : tint(47, 179, 107, 0.05);
          break;
      }
      ring.setPixelColor(i, c);
    }
    ring.show();
  }
}

void wavHeader(uint8_t *h, uint32_t samples) {
  uint32_t data = samples * 2, v;
  memcpy(h, "RIFF", 4); v = 36 + data; memcpy(h + 4, &v, 4);
  memcpy(h + 8, "WAVEfmt ", 8); v = 16; memcpy(h + 16, &v, 4);
  uint16_t pcm = 1, ch = 1, align = 2, bits = 16; uint32_t rate = RATE, bps = RATE * 2;
  memcpy(h + 20, &pcm, 2); memcpy(h + 22, &ch, 2); memcpy(h + 24, &rate, 4);
  memcpy(h + 28, &bps, 4); memcpy(h + 32, &align, 2); memcpy(h + 34, &bits, 2);
  memcpy(h + 36, "data", 4); memcpy(h + 40, &data, 4);
}

// Records while the button is held. Returns the number of samples.
size_t record() {
  mic.setPinsPdmRx(PIN_MIC_CLK, PIN_MIC_DAT);
  if (!mic.begin(I2S_MODE_PDM_RX, RATE, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO)) return 0;
  int16_t *s = rec + 22, scratch[256];
  mic.readBytes((char *)scratch, sizeof scratch);  // the mic's first moments are noise
  size_t n = 0, cap = RATE * MAX_SEC;
  while (digitalRead(PIN_BUTTON) == LOW && n < cap)
    n += mic.readBytes((char *)(s + n), min((size_t)512, cap - n) * 2) / 2;
  mic.end();
  for (size_t i = 0; i < n; i++) s[i] = constrain((int32_t)s[i] * MIC_GAIN, -32768, 32767);
  wavHeader((uint8_t *)rec, n);
  return n;
}

// Sends the recording; fills in the answer text.
bool ask(size_t samples, String &answer) {
  WiFiClientSecure tls;
  tls.setInsecure();  // skips certificate checks: simpler and never expires; see README
  HTTPClient http;
  http.setTimeout(45000);
  http.begin(tls, String(URL) + "?do=ask");
  http.addHeader("content-type", "audio/wav");
  http.addHeader("x-snowman-key", SNOWMAN_KEY);
  int code = http.POST((uint8_t *)rec, 44 + samples * 2);
  String body = http.getString();
  http.end();
  Serial.printf("ask -> %d %s\n", code, body.c_str());
  JsonDocument doc;
  if (code != 200 || deserializeJson(doc, body)) return false;
  answer = doc["a"] | "";
  return answer.length() > 0;
}

// Plays the answer on the snowman's own speaker (24 kHz 16-bit mono PCM from the server).
void sayOnBoard(const String &text) {
  JsonDocument req; req["text"] = text; req["fmt"] = "pcm";
  String json; serializeJson(req, json);
  WiFiClientSecure tls; tls.setInsecure();
  HTTPClient http;
  http.setTimeout(30000);
  http.begin(tls, String(URL) + "?do=say");
  http.addHeader("content-type", "application/json");
  http.addHeader("x-snowman-key", SNOWMAN_KEY);
  int code = http.POST(json);
  if (code != 200) { Serial.printf("say -> %d\n", code); http.end(); mode = OOPS; delay(1500); mode = IDLE; return; }
  spk.setPins(PIN_SPK_BCLK, PIN_SPK_LRC, PIN_SPK_DIN);
  spk.begin(I2S_MODE_STD, 24000, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO);
  WiFiClient *s = http.getStreamPtr();
  int left = http.getSize();  // -1 when the server does not say
  uint8_t buf[1024];
  talkFrom = millis(); talkUntil = talkFrom + 5000; mode = TALK;
  while (http.connected() && left != 0) {
    size_t want = min((size_t)s->available(), sizeof buf) & ~1u;  // whole samples only
    if (!want) { delay(1); continue; }
    int got = s->readBytes(buf, want);
    spk.write(buf, got);
    talkUntil = millis() + 300;
    if (left > 0) left -= got;
  }
  spk.end();
  http.end();
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  ring.begin(); ring.setBrightness(60); ring.show();  // 60/255 keeps the ring's current low
  xTaskCreatePinnedToCore(ledTask, "led", 4096, nullptr, 1, nullptr, 0);
  rec = (int16_t *)ps_malloc(44 + RATE * MAX_SEC * 2);
  if (!rec) { Serial.println("No PSRAM: pick the 2MB PSRAM board in Tools > Board"); mode = OOPS; for (;;) delay(1000); }
  wifi.addAP(WIFI_SSID, WIFI_PASS);
  if (strlen(WIFI_SSID2)) wifi.addAP(WIFI_SSID2, WIFI_PASS2);
}

void loop() {
  if (wifi.run() != WL_CONNECTED) { mode = BOOT; delay(500); return; }
  if (mode == BOOT) { mode = IDLE; Serial.printf("Wi-Fi ok, %s\n", WiFi.localIP().toString().c_str()); }
  if (mode == TALK || digitalRead(PIN_BUTTON) != LOW) { delay(10); return; }
  delay(30);
  if (digitalRead(PIN_BUTTON) != LOW) return;  // a bounce, not a press

  mode = LISTEN;
  size_t n = record();
  if (n < RATE * 3 / 10) { mode = IDLE; return; }  // under 0.3 s: a tap, not a question
  mode = THINK;
  String a;
  if (!ask(n, a)) { mode = OOPS; delay(1500); mode = IDLE; return; }
  if (SPEAK_ON_BOARD) sayOnBoard(a);
  else {  // the projector page speaks; move the mouth for about as long (about 14 characters a second)
    talkFrom = millis() + LAG_MS;
    talkUntil = talkFrom + 500 + a.length() * 1000 / 14;
    mode = TALK;
  }
}
