/* eslint-disable @typescript-eslint/no-var-requires */
let decorators: any = {}
try {
  decorators = require('class-validator/cjs/decorator/decorators')
} catch {
  try {
    decorators = require('class-validator')
  } catch {}
}

const getDecorator = (name: string): any => {
  if (typeof decorators[name] === 'function') return decorators[name]
  if (decorators.decorators && typeof decorators.decorators[name] === 'function') {
    return decorators.decorators[name]
  }
  return () => () => {}
}

export const IsOptional: any = getDecorator('IsOptional')
export const IsString: any = getDecorator('IsString')
export const IsEnum: any = getDecorator('IsEnum')
export const IsInt: any = getDecorator('IsInt')
export const IsNumber: any = getDecorator('IsNumber')
export const Min: any = getDecorator('Min')
export const Max: any = getDecorator('Max')
export const IsArray: any = getDecorator('IsArray')
export const ValidateNested: any = getDecorator('ValidateNested')
export const IsUUID: any = getDecorator('IsUUID')
