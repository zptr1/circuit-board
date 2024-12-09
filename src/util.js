let $instanceId = 0;
let $zIndex = 10;

const alignGrid = (pos, size=10) => ~~(pos / size) * size;

function findMinPos(gates, lines) {
  let minX = Infinity, minY = Infinity;

  if (gates) for (const gate of gates) {
    if (gate.x < minX) minX = gate.x;
    if (gate.y < minY) minY = gate.y;
  }

  if (lines) for (const line of lines) {
    if (line.x1 < minX) minX = line.x1;
    if (line.x2 < minX) minX = line.x2;

    if (line.y1 < minY) minY = line.y1;
    if (line.y2 < minY) minY = line.y2;
  }

  return [minX, minY];
}


function findMaxPos(gates, lines) {
  let maxX = 0, maxY = 0;

  if (gates) for (const gate of gates) {
    if (gate.x > maxX) maxX = gate.x;
    if (gate.y > maxY) maxY = gate.y;
  }

  if (lines) for (const line of lines) {
    if (line.x1 > maxX) maxX = line.x1;
    if (line.x2 > maxX) maxX = line.x2;

    if (line.y1 > maxY) maxY = line.y1;
    if (line.y2 > maxY) maxY = line.y2;
  }

  return [maxX, maxY];
}

const COMPRESSION_RIXITS = (
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  + "ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ"
  + "!\"#$%&'()*+./:<=>?@[\\]^_`{|}~¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿"
);

function encodeInt(int, rixits=COMPRESSION_RIXITS) {
  if (!int) return "";

  const neg = int < 0;
  if (neg) int = -int;

  let rixit, str = "";
  let residual = Math.floor(int);

  for (;;) {
    str = rixits[rixit = residual % rixits.length] + str;
    residual = Math.floor(residual / rixits.length);
    if (!residual) break;
  }

  return neg ? "-" + str : str;
}

function decodeInt(str, rixits=COMPRESSION_RIXITS) {
  if (!str) return 0;

  const neg = str[0] == "-";
  if (neg) str = str.slice(1);

  let int = 0;
  for (let i = 0; i < str.length; i++)
    int = (int * rixits.length) + rixits.indexOf(str[i]);

  return neg ? -int : int;
}
