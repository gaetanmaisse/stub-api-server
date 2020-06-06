/* eslint-disable @typescript-eslint/no-use-before-define */
import Bluebird from 'bluebird';
import { isFunction, isPlainObject } from 'lodash';

import {
  RequestPayload,
  RequestQuery,
  RouteHandlerContext,
  Template,
  TemplateObject,
  TemplateObjectValue,
} from '../route-config';

export function processTemplate(
  template: Template,
  context: RouteHandlerContext,
): Promise<unknown> {
  let result: unknown = template;

  if (isFunction(template)) {
    result = template(...extractTemplateFunctionParams(context));
  }

  if (isTemplateObject(template)) {
    result = Bluebird.reduce(
      Object.entries(template),
      processObjectKey(context),
      {},
    );
  }

  if (!isPromise(result)) {
    return Promise.resolve(result);
  }

  return result;
}

function extractTemplateFunctionParams(
  context: RouteHandlerContext,
): [RequestQuery | undefined, RequestPayload | undefined] {
  return [context.query, context.payload];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isPromise(value: any): value is Promise<unknown> {
  return !!value && 'function' === typeof value.then;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isTemplateObject(value: any): value is TemplateObject {
  return isPlainObject(value);
}

function processObjectKey(context: RouteHandlerContext) {
  return async (
    result: TemplateObject,
    [key, value]: [string, TemplateObjectValue],
  ) => {
    result[key] = (await processTemplate(value, context)) as TemplateObject;
    return result;
  };
}