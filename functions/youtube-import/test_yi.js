import { Innertube, UniversalCache } from 'youtubei.js';
import Jintr from 'jintr';

async function test() {
  try {
    const youtube = await Innertube.create({
      generate_session_locally: true,
      fetch: fetch,
      eval: (code, env) => {
        const jintr = new Jintr();
        const result = jintr.evaluate(code, env);
        return result;
      }
    });
    const info = await youtube.getInfo('q3RBG2G2AhE');
    console.log('Got info:', info.basic_info.title);

    const stream = await info.download({ type: 'audio', format: 'mp4' });
    const reader = stream.getReader();
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      if (chunks.length > 5) break;
    }
    console.log('Stream successful! Chunks received:', chunks.length);
  } catch (err) {
    console.error('Failed:', err);
  }
}
test();