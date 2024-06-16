import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsBigInt(validationOptions?: ValidationOptions): PropertyDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isBigInt',
      target: target.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: any) {
          //args: ValidationArguments
          if (typeof value === 'bigint') {
            return true;
          }

          if (typeof value === 'number') {
            return Number.isInteger(value);
          }

          if (typeof value === 'string') {
            if (/^\d+n$/.test(value)) {
              // // Trim the last 'n' character and check if all other characters are digits
              value = value.slice(0, -1);
            }
            // Checking if a string consists of only numbers
            if (/^\d+$/.test(value)) {
              try {
                BigInt(value); // Attempt to convert to BigInt
                return true;
              } catch (e) {
                return false;
              }
            }
          }
          return false;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid BigInt or a string/number that can be converted to BigInt`;
        },
      },
    });
  };
}
