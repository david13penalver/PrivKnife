export interface HashTestVector {
  input: string;
  sha256: string;
  sha512: string;
  sha1: string;
  md5: string;
}

export const KNOWN_HASH_VECTORS: HashTestVector[] = [
  {
    input: '',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    sha512:
      'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
    sha1: 'da39a3ee5e6b4b0d3255bfef95601890afd80709',
    md5: 'd41d8cd98f00b204e9800998ecf8427e',
  },
  {
    input: 'hello world',
    sha256: 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9',
    sha512:
      '309ecc489c12d6eb4cc40f50c902f2b4d0ed77ee511a7c7a9bcd3ca86d4cd86f989dd35bc5ff499670da34255b45b0cfd830e81f605dcf7dc5542e93ae9cd76f',
    sha1: '2aae6c35c94fcfb415dbe95f408b9ce91ee846ed',
    md5: '5eb63bbbe01eeed093cb22bb8f5acdc3',
  },
  {
    input: 'The quick brown fox jumps over the lazy dog',
    sha256: 'd7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592',
    sha512:
      '07e547d9586f6a73f73fbac0435ed76951218fb7d0c8d788a309d785436bbb642e93a252a954f23912547d1e8a3b5ed6e1bfd7097821233fa0538f3db854fee6',
    sha1: '2fd4e1c67a2d28fced849ee1bb76e7391b93eb12',
    md5: '9e107d9d372bb6826bd81d3542a419d6',
  },
];

// RFC 4122 standard UUIDv4 regular expression (lowercase with hyphens)
export const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// 32-character hexadecimal UUID without hyphens
export const UUID_V4_NO_HYPHENS_REGEX =
  /^[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/;
