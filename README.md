<img alt="massage mascot" src="mascot.svg" height="200" />

MassagePack: Soothe Your Aching Objects
=======================================
MassagePack is a [MessagePack][1] codec and a JSON encoder that represents
oversized integers as [BigInt][2] values.

The MessagePack codec is just a wrapper around Yusuke Kawasaki's
[messagepack-lite][3].

The JSON encoder is written in pure Javascript.

Usage
-----
```javascript
const fs = require('fs');
const MassagePack = require('massagepack');

const stdinFd = 0;
const inputBuffer = fs.readFileSync(stdinFd);
const object = MassagePack.decode(inputBuffer);

process.stdout.write(MassagePack.encodeJSON(object));
```

[1]: https://msgpack.org/index.html
[2]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
[3]: https://www.npmjs.com/package/msgpack-lite
