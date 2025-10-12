import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isAddress } from 'viem';

@Injectable()
export class AddressValidationPipe implements PipeTransform {
  transform(value: any) {
    if (!value) {
      throw new BadRequestException('Address is required');
    }

    if (!isAddress(value)) {
      throw new BadRequestException(`Invalid Ethereum address: ${value}`);
    }

    return value.toLowerCase();
  }
}
