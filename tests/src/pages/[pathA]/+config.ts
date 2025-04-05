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
    try {
      const { data } = await axios.get(`https://jsonplaceholder.typicode.com/posts/${req.params.pathC}`);
      return {
        ...data,
        ...req.params,
      };
    } catch (err) {
      console.error('could not fetch', req);
    }
  }
}