import Bluebird from 'bluebird';

import { ResponseGenerator } from './response-generator';
import {
  RequestPayload,
  RequestQuery,
  RouteConfig,
  RequestContext,
  Template,
} from './route-config';
import { newRouteConfig } from '../test/fixtures';

describe('RouteGenerator should', () => {
  function aGeneratorFor(config: RouteConfig) {
    return new ResponseGenerator(config);
  }

  async function generatedBody(
    template: Template,
    context: RequestContext<unknown>,
  ) {
    const generator = aGeneratorFor(newRouteConfig({ template }));
    const response = await generator.generate(context);
    return response.body;
  }

  function newContext(query?: RequestQuery, payload?: RequestPayload<unknown>) {
    return { query, payload, url: 'http://localhost:8000' };
  }

  it('generate a 200 response by default', async () => {
    const route = newRouteConfig({ template: 'Hello World' });
    const context = newContext();

    const response = await aGeneratorFor(route).generate(context);
    expect(response.status).toBe(200);
  });

  it('process a simple value template', async () => {
    const context = newContext();
    expect(await generatedBody(true, context)).toEqual(true);
    expect(await generatedBody('Hello World', context)).toEqual('Hello World');
    expect(await generatedBody(123, context)).toEqual(123);
    expect(await generatedBody(null, context)).toEqual(null);
  });

  describe('process object templates', () => {
    it('using simple values', async () => {
      const context = newContext();
      const template = { message: 'Hello World' };
      const templateDeep = { root: { msg: 'Hello' } };

      expect(await generatedBody(template, context)).toEqual({
        message: 'Hello World',
      });
      expect(await generatedBody(templateDeep, context)).toEqual({
        root: { msg: 'Hello' },
      });
    });

    it('using functions with query provided', async () => {
      const template = {
        message: (ctx: RequestContext<unknown>) => `Hello ${ctx.query?.name}`,
      };
      const context = newContext({ name: 'John' });

      expect(await generatedBody(template, context)).toEqual({
        message: 'Hello John',
      });
    });

    it('using functions with request body provided', async () => {
      type Body = { name: string };
      const template = {
        message: (ctx: RequestContext<Body>) => `Hello ${ctx.payload?.name}`,
      };
      const context = newContext({}, { name: 'John' });

      expect(await generatedBody(template, context)).toEqual({
        message: 'Hello John',
      });
    });
  });

  describe('process function templates', () => {
    it('using query provided', async () => {
      const template = (ctx: RequestContext<unknown>) =>
        `Hello ${ctx.query?.name}`;
      const context = newContext({ name: 'John' });

      expect(await generatedBody(template, context)).toEqual('Hello John');
    });

    it('using request body provided', async () => {
      type Body = { name: string };
      const template = (ctx: RequestContext<Body>) =>
        `Hello ${ctx.payload?.name}`;
      const context = newContext({}, { name: 'John' });

      expect(await generatedBody(template, context)).toEqual('Hello John');
    });

    it('using async function', async () => {
      const template = () => Bluebird.delay(10).then(() => 'Hello World');
      const context = newContext();

      expect(await generatedBody(template, context)).toEqual('Hello World');
    });
  });
});
