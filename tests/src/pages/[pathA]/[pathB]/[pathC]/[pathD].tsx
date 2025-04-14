import { ServerRequest } from 'xpine/dist/types';
import { addToArray, context } from 'xpine';
import axios from 'axios';

export function xpineOnLoad() {
  context.set('navbar', addToArray('pathD', 0), []);
}

export const config = {
  staticPaths() {
    return [
      {
        pathA: 'my-path-a2',
        pathB: 'my-path-b2',
        pathC: 'my-path-c2',
        pathD: '2'
      }
    ]
  },
  async data(req: ServerRequest) {
    const url = `https://jsonplaceholder.typicode.com/posts/${req.params.pathD}`;
    try {
      const { data } = await axios.get(url);
      return {
        ...data,
        ...req.params,
      };
    } catch (err) {
      console.error('could not fetch', url);
      return {
        ...req.params,
        data: {},
      }
    }
  }
}

export default function Component({ data }) {
  return (
    <div x-data="PathDData">
      <div data-testid="path-d-data">{data.title}</div>
      <div data-testid="path-d-patha">{data.pathA}</div>
      <div data-testid="path-d-pathb">{data.pathB}</div>
      <div data-testid="path-d-pathc">{data.pathC}</div>
      <button data-testid="path-d-button" x-bind:style="`background-color: ${color}`" x-on:click="color = getColor()">Change color</button>
    </div>
  );
}

<script />
import { getColor } from '../../../../utils/color';

export function PathDData() {
  return {
    color: 'red',
    getColor,
  }
}
