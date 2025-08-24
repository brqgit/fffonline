import { startGame } from './game/index.js';
import * as audio from './audio.js';
import * as rules from './rules.js';
import * as render from './render.js';
import * as network from './network.js';

window.FFF = { startGame, audio, rules, render, network };
