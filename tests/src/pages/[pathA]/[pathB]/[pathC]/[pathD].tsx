import { ServerRequest } from 'xpine/dist/types';
import axios from 'axios';


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
    try {
      const { data } = await axios.get(`https://jsonplaceholder.typicode.com/posts/${req.params.pathD}`);
      return {
        ...data,
        ...req.params,
      };
    } catch (err) {
      console.error('could not fetch', req);
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
