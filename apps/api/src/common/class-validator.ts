import * as classValidator from 'class-validator'

const cv: any = (classValidator as any).default || classValidator

const getDecorator = (name: string) => {
  const fn = cv[name] || (classValidator as any)[name] || (classValidator as any).default?.[name]
  if (typeof fn === 'function') {
    return fn
  }
  return () => () => {}
}

export const IsOptional: typeof classValidator.IsOptional = (...args: any[]) => (getDecorator('IsOptional'))(...args)
export const IsString: typeof classValidator.IsString = (...args: any[]) => (getDecorator('IsString'))(...args)
export const IsEnum: typeof classValidator.IsEnum = (...args: any[]) => (getDecorator('IsEnum'))(...args)
export const IsInt: typeof classValidator.IsInt = (...args: any[]) => (getDecorator('IsInt'))(...args)
export const IsNumber: typeof classValidator.IsNumber = (...args: any[]) => (getDecorator('IsNumber'))(...args)
export const Min: typeof classValidator.Min = (...args: any[]) => (getDecorator('Min'))(...args)
export const Max: typeof classValidator.Max = (...args: any[]) => (getDecorator('Max'))(...args)
export const IsArray: typeof classValidator.IsArray = (...args: any[]) => (getDecorator('IsArray'))(...args)
export const ValidateNested: typeof classValidator.ValidateNested = (...args: any[]) => (getDecorator('ValidateNested'))(...args)
export const IsUUID: typeof classValidator.IsUUID = (...args: any[]) => (getDecorator('IsUUID'))(...args)
