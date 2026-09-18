/*Author: Erik Marques*/
import { hashPassword } from "./password.js";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Uso: npx tsx src/auth/hash-password.ts <senha-com-12-ou-mais-caracteres>");
  process.exit(1);
}
console.log(await hashPassword(password));
