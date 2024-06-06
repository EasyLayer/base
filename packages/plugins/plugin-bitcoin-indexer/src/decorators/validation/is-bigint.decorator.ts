import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsBigInt(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (target: Object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isBigInt',
      target: target.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value === 'bigint') {
            return true;
          }

          if (typeof value === 'number') {
            return Number.isInteger(value);
          }

          if (typeof value === 'string') {
            if (/^\d+n$/.test(value)) {
              // Обрезаем последний символ 'n' и проверяем, все ли остальные символы цифры
              value = value.slice(0, -1);
            }
            // Проверяем, состоит ли строка только из цифр
            if (/^\d+$/.test(value)) {
              try {
                BigInt(value); // Попытка преобразования в BigInt
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
        }
      },
    });
  };
}
