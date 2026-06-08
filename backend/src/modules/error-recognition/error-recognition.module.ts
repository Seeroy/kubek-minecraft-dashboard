import { Module } from "@nestjs/common";
import { ErrorRecognizerService } from "./error-recognizer.service";

@Module({
  providers: [ErrorRecognizerService],
  exports: [ErrorRecognizerService],
})
export class ErrorRecognitionModule {}
