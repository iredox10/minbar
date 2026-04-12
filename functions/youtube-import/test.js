import ytdl from '@distube/ytdl-core';

async function test() {
  try {
    const url = 'https://youtu.be/q3RBG2G2AhE?si=uqF-bUERqOD72mEH';
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    console.log('Format chosen:', format.mimeType, format.container);
    
    const stream = ytdl.downloadFromInfo(info, { format });
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
      if (chunks.length > 50) {
        break;
      }
    }
    console.log('Successfully downloaded some chunks!');
  } catch (e) {
    console.error('Error:', e);
  }
}
test();