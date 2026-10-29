import { Logger } from "@nestjs/common";

// expected failures in tests would flood the output
Logger.overrideLogger(false);
