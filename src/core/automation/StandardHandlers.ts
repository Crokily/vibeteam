import { InteractionHandler } from './types';

const pressEnter: InteractionHandler = () => '\r';

const confirmYes: InteractionHandler = () => 'y';

export const StandardHandlers = {
  pressEnter,
  confirmYes,
};
