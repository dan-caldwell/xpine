import { ServerRequest } from 'xpine/dist/types';
import axios from 'axios';

export default {
  staticPaths() {
    return [
      {
        pathA: 'my-path-a',
        pathB: 'my-path-b',
        pathC: '1',
      }
    ]
  },
  async data(req: ServerRequest) {
    const url = `https://jsonplaceholder.typicode.com/posts/${req.params.pathC}`;
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