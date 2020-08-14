import {ChatMessage} from "./chat-message.model";
import {User} from "./user.model";

export interface Chat {
    chatId: number;
    messages: Array<ChatMessage>;
    users: Array<User>;
}
