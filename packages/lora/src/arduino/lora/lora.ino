#include <WebUSB.h>
#include "base64.hpp"

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
bool receiving;

void setupRadio() {
  pinMode(RFM95_RST, OUTPUT);
  digitalWrite(RFM95_RST, HIGH);
    // manual reset
  digitalWrite(RFM95_RST, LOW);
  delay(10);
  digitalWrite(RFM95_RST, HIGH);
  delay(10);

  while (!rf95.init()) {
    Serial.println("LoRa radio init failed");
    while (1);
  }
  Serial.println("LoRa radio init OK!");

  // Defaults after init are 434.0MHz, modulation GFSK_Rb250Fd250, +13dbM
  if (!rf95.setFrequency(RF95_FREQ)) {
    Serial.println("setFrequency failed");
    while (1);
  }
  Serial.print("Set Freq to: "); Serial.println(RF95_FREQ);
  
  // Defaults after init are 434.0MHz, 13dBm, Bw = 125 kHz, Cr = 4/5, Sf = 128chips/symbol, CRC on

  // The default transmitter power is 13dBm, using PA_BOOST.
  // If you are using RFM95/96/97/98 modules which uses the PA_BOOST transmitter pin, then 
  // you can set transmitter powers from 5 to 23 dBm:
  rf95.setTxPower(15, false);
}

void setup() {
  while (!Serial) {
    ;
  }
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
  setupRadio();
}

void transmit() {
  receiving = false;
  int arg = argString.toInt();
  argString = "";
  transmitting = true;
  Serial.write("transmitting ");
  Serial.write(arg+'0');
  Serial.write(" lines\n");
  Serial.flush();
  transmitCount = arg;
}

// how big does this actually need to be?
unsigned char base64[128];
void receive() {
  if (receiving) return;
  inputbufPos = 0;
  int waitTime = argString.toInt();
  argString = "";
  Serial.write("receiving for ");
  Serial.write(waitTime+'0');
  Serial.write(" seconds\n");
  Serial.flush();
  receiving = true;
  unsigned long stopTime = (waitTime * 1000) + millis();
  while((waitTime == 0 || millis() < stopTime) && receiving) {
    if (rf95.available())
    {
      // Should be a message for us now
      uint8_t buf[RH_RF95_MAX_MESSAGE_LEN];
      uint8_t len = sizeof(buf);
      if (rf95.recv(buf, &len))
      {
        Serial.write("Got: ");
        Serial.write((char*)buf, len);
        Serial.write("\n");
        Serial.flush();
        // now send the actual base64 data
        uint8_t b64Length = encode_base64(buf, len, base64);
        Serial.write((char*)base64, b64Length);
        Serial.write("\n");
        Serial.flush();
//        receiving = false;
      } else {
        Serial.write("Receive failed\n");
        Serial.flush();
      }
    } else {
      processInput();
//      Serial.write("no data yet, waiting...\n");
      Serial.flush();
      delay(100); // break so we can check for cancel (does this work?)
    }
  }
  receiving = false;
  Serial.write("Done receiving\n");
  Serial.flush();
}

unsigned char binaryPacket[RH_RF95_MAX_MESSAGE_LEN];

void transmitPacket(const uint8_t * b64, uint8_t len) {
//  unsigned char binary[len];
  unsigned int binaryLength = decode_base64(b64, binaryPacket);
  Serial.write("sending ");
//  Serial.write(b64, len);
  Serial.write(binaryPacket, binaryLength);
  Serial.write(" via LoRa\n");
  Serial.flush();
  rf95.send(binaryPacket, binaryLength);
  delay(10);
  rf95.waitPacketSent();
  Serial.write("sent packet\n");
  Serial.flush();
  transmitCount--;
  if (transmitCount == 0) {
    transmitting = false;
    Serial.write("!! Done transmitting !!\n");
    Serial.flush();
  }
}

void cancel() {
//  Serial.write("canceling current operations\n");
//  Serial.flush();
  transmitCount = 0;
  transmitting = false;
  receiving = false;
  inputbufPos = 0;
  argString = "";
}

void loop() {
  processInput();
}

void processInput() {
  if (Serial && Serial.available()) {
    int byte = Serial.read();

//    Serial.write("raw byte: ");
//    Serial.write(byte);
//    Serial.write("\n");
//    Serial.flush();

    if (byte == '\n') {
      if (isCommand) {
        Serial.write("running command ");
        Serial.write(cmd);
        Serial.write("\n");
        inputbufPos = 0;
        if (strcmp(cmd,TRANSMIT) == 0) {
          transmit();
        } else if (strcmp(cmd,RECEIVE) == 0) {
          receive();
        } else if (strcmp(cmd,CANCEL) == 0) {
          cancel();
        }
        Serial.flush();
      }
      int i;
      if (!isCommand) {
        if (transmitting && inputbufPos > 0) {
          Serial.write("will transmit ");
          Serial.write(inputbuf, inputbufPos);
          Serial.write("\n");
          Serial.flush();
          transmitPacket(inputbuf, inputbufPos);
        }
        inputbufPos = 0;
      }
      isCommand = false;
    } else {
      if (byte == ' ') isCommand = true;
      if (inputbufPos < BUFSIZE) {
        inputbuf[inputbufPos] = byte;      
      }
      // buffer the first chars in case it's a command
//      Serial.write("inputbufPos now ");
//      Serial.write(inputbufPos+'0');
//      Serial.write("\n");
//      Serial.flush();
      if (inputbufPos < COMMANDSIZE) {
        cmd[inputbufPos] = byte;
//        Serial.write("command buffer now ");
//        Serial.write(cmd);
//        Serial.write("\n");
//        Serial.flush();
      }
      // if this is after the space and it's
      // a command, it's an argument, so buffer it
      if (isCommand && inputbufPos >= COMMANDSIZE+1) {
        argString += (char)byte;
      }
      inputbufPos++;      
    }
  }
}
