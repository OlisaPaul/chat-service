import {config} from "dotenv";
import jwt from 'jsonwebtoken';

config()

const token = jwt.sign(
  { sub: 'appA:eve', name: 'eve' },
  process.env.JWT_SHARED_SECRET || "",
  { expiresIn: '7d' },
);

console.log(token);
