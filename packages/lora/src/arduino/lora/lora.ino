#include <WebUSB.h>

/**
 * Creating an instance of WebUSBSerial will add an additional USB interface to
 * the device that is marked as vendor-specific (rather than USB CDC-ACM) and
 * is therefore accessible to the browser.
 *
 * The URL here provides a hint to the browser about what page the user should
 * navigate to to interact with the device.
 */
WebUSB WebUSBSerial(1 /* https:// */, "192.168.7.25:9966");

#define Serial WebUSBSerial

const int ledPin = 13;

#include <SPI.h>
#include <RH_RF95.h>

/* for feather32u4 */
#define RFM95_CS 8
#define RFM95_RST 4
#define RFM95_INT 7

// Change to 434.0 or other frequency, must match RX's freq!
#define RF95_FREQ 915.0

// Singleton instance of the radio driver
RH_RF95 rf95(RFM95_CS, RFM95_INT);

uint8_t buf[RH_RF95_MAX_MESSAGE_LEN];
uint8_t len = sizeof(buf);

void setup() {
  while (!Serial) {
    ;
  }
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);

}

void loop() {
  if (Serial && Serial.available()) {
    int byte = Serial.read();

    if (byte == '\n') {
      Serial.flush();
    } else {
      Serial.write(byte);
//      Serial.flush();
    }

//    Serial.write(byte);
//    if (byte == 'H') {
//      Serial.write("\r\nTurning LED on.");
//      digitalWrite(ledPin, HIGH);
//    } else if (byte == 'L') {
//      Serial.write("\r\nTurning LED off.");
//      digitalWrite(ledPin, LOW);
//    }
//    Serial.write("\r\n> ");
//    Serial.flush();
  }
}