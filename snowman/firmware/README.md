# Flurry the talking snowman: board setup

How it works: you hold the belly button and talk. The board records your question and sends it to
`qourlite.xyz/api/snowman`. The site turns the speech into text, writes Flurry's answer, and shows it on
the projector page (`qourlite.xyz/snowman/`), which speaks it through the room speakers. While it talks,
the LED ring mouth moves.

## Parts (Adafruit)
| Part | Adafruit # |
|---|---|
| ESP32-S3 Feather, 4MB flash / 2MB PSRAM | 5477 |
| PDM MEMS microphone | 3492 |
| MAX98357A I2S amplifier (only needed for the snowman's own speaker) | 3006 |
| Mono enclosed speaker 3W 4 ohm | 3351 |
| NeoPixel ring, 12 LEDs | 1643 |
| 60mm arcade button | 1190 |

## Wiring
| From | To (Feather pin) |
|---|---|
| Button, one leg | D5 |
| Button, other leg | GND |
| Ring DIN | D6 |
| Ring 5V / PWR | USB |
| Ring GND | GND |
| Mic 3V | 3V |
| Mic GND | GND |
| Mic SEL | GND |
| Mic CLK | D9 |
| Mic DAT | D10 |
| Amp Vin | USB |
| Amp GND | GND |
| Amp BCLK | A0 |
| Amp LRC | A1 |
| Amp DIN | A2 |
| Speaker + / - | Amp + / - |

The arcade button's built-in LED is not used. Mount the ring with LED 0 at the bottom: the mouth opens
outward from that LED.

## LED mouth
- Blue dot going around: joining Wi-Fi
- Slow orange glow: ready
- Solid green: listening (button held)
- Two orange dots spinning: thinking
- Orange, opening and closing: talking
- Blinking red: something failed. Try again. The board prints the reason on the USB serial monitor.

## Flashing the board (one-time setup)
1. Install the Arduino IDE.
2. In Boards Manager, install "esp32 by Espressif" (version 3.x).
3. In Library Manager, install "Adafruit NeoPixel" and "ArduinoJson".
4. Copy `flurry/secrets.example.h` to `flurry/secrets.h` and fill in the hotspot name and password and the
   snowman key. Never commit `secrets.h`. This repo is public.
5. Open `flurry/flurry.ino`. Pick the board "Adafruit Feather ESP32-S3 2MB PSRAM", then click Upload.

## Settings at the top of flurry.ino
- `SPEAK_ON_BOARD`: set it to `true` to play answers on the snowman's own small speaker instead of the
  room speakers. If you do, turn the laptop's sound off, or each answer plays twice.
- `MIC_GAIN`: raise it if Flurry keeps saying it has snow in its ears. Lower it if the transcripts look
  garbled.
- `LAG_MS`: the delay between the board getting an answer and the projector starting to speak. Tune it at
  rehearsal so the mouth matches the voice.

## Website side (Vercel environment variables)
- `ANTHROPIC_API_KEY`: writes Flurry's answers
- `OPENAI_API_KEY`: speech to text and Flurry's voice
- `SNOWMAN_KEY`: any long random text. Use the same value in `secrets.h`.

## Known tradeoff
The board does not check the site's HTTPS certificate (`setInsecure`). This means a certificate renewal
can never break it. The risk is that someone on the same hotspot could read the snowman key. The key only
lets someone make Flurry talk, and you can change it in Vercel at any time.
