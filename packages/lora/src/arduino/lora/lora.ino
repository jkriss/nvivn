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

#define BUFSIZE 256
char inputbuf[BUFSIZE];
int inputbufPos;
bool isCommand;

#define COMMANDSIZE 2
char cmd[COMMANDSIZE+1]; // add room for string termination byte
String argString = "";

#define TRANSMIT "tx"
#define RECEIVE "rx"
#define CANCEL "ca"

int transmitCount;
int receiveCount;
bool transmitting;

void setup() {
  while (!Serial) {
    ;
  }
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);

}

void transmit() {
  int arg = argString.toInt();
  transmitting = true;
  Serial.write("transmitting ");
  Serial.write(arg+'0');
  Serial.write(" lines\n");
  Serial.flush();
  transmitCount = arg;
}

void transmitPacket(const uint8_t * data, uint8_t len) {
  Serial.write("sending ");
  Serial.write(data, len);
  Serial.write(" via LoRa\n");
  Serial.flush();
  transmitCount--;
  if (transmitCount == 0) {
    transmitting = false;
    Serial.write("!! Done transmitting !!\n");
    Serial.flush();
  }
}

void cancel() {
  transmitCount = 0;
  transmitting = false;
  // TODO stop receiving, too
}

void loop() {
  if (Serial && Serial.available()) {
    int byte = Serial.read();

    if (byte == '\n') {
      if (isCommand) {
        Serial.write("running command");
        Serial.write(cmd);
        Serial.write("\n");
        if (strcmp(cmd,TRANSMIT) == 0) {
          transmit();
        } else if (strcmp(cmd,RECEIVE) == 0) {
          // TODO
        } else if (strcmp(cmd,CANCEL) == 0) {
          cancel();
        }
      }
      int i;
      if (!isCommand) {
        if (transmitting) {
          Serial.write("will transmit ");
          Serial.write(inputbuf, inputbufPos);
          Serial.write("\n");
          Serial.flush();
          transmitPacket(inputbuf, inputbufPos);
        }
      }
      Serial.flush();
      inputbufPos = 0;
      isCommand = false;
      argString = "";
    } else {
      if (byte == ' ') isCommand = true;
      if (inputbufPos < BUFSIZE) {
        inputbuf[inputbufPos] = byte;      
      }
      // buffer the first chars in case it's a command
      if (inputbufPos < COMMANDSIZE) {
        cmd[inputbufPos] = byte;
      }
      // if this is after the space and it's
      // a command, it's an argument, so buffer it
      if (isCommand && inputbufPos == COMMANDSIZE+1) {
        argString += (char)byte;
      }
      inputbufPos++;      
    }
  }
}
