import { randomBytes } from "crypto";

export const generateRandomString = (length: number = 16) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let result = "";

  const randomBuffer = randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += characters[randomBuffer[i] % charactersLength];
  }

  return result;
};
