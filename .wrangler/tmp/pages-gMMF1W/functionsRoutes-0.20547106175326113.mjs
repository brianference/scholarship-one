import { onRequestPost as __api_auth_request_ts_onRequestPost } from "C:\\Users\\brian\\workspace\\projects\\scholarship-one\\functions\\api\\auth\\request.ts"
import { onRequestGet as __api_auth_session_ts_onRequestGet } from "C:\\Users\\brian\\workspace\\projects\\scholarship-one\\functions\\api\\auth\\session.ts"
import { onRequestPost as __api_auth_signout_ts_onRequestPost } from "C:\\Users\\brian\\workspace\\projects\\scholarship-one\\functions\\api\\auth\\signout.ts"
import { onRequestPost as __api_auth_verify_ts_onRequestPost } from "C:\\Users\\brian\\workspace\\projects\\scholarship-one\\functions\\api\\auth\\verify.ts"
import { onRequestPost as __api_chat_ts_onRequestPost } from "C:\\Users\\brian\\workspace\\projects\\scholarship-one\\functions\\api\\chat.ts"
import { onRequestPost as __api_digest_send_ts_onRequestPost } from "C:\\Users\\brian\\workspace\\projects\\scholarship-one\\functions\\api\\digest-send.ts"
import { onRequestGet as __api_health_ts_onRequestGet } from "C:\\Users\\brian\\workspace\\projects\\scholarship-one\\functions\\api\\health.ts"
import { onRequestDelete as __api_saves_ts_onRequestDelete } from "C:\\Users\\brian\\workspace\\projects\\scholarship-one\\functions\\api\\saves.ts"
import { onRequestGet as __api_saves_ts_onRequestGet } from "C:\\Users\\brian\\workspace\\projects\\scholarship-one\\functions\\api\\saves.ts"
import { onRequestPost as __api_saves_ts_onRequestPost } from "C:\\Users\\brian\\workspace\\projects\\scholarship-one\\functions\\api\\saves.ts"

export const routes = [
    {
      routePath: "/api/auth/request",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_request_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/session",
      mountPath: "/api/auth",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_session_ts_onRequestGet],
    },
  {
      routePath: "/api/auth/signout",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_signout_ts_onRequestPost],
    },
  {
      routePath: "/api/auth/verify",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_verify_ts_onRequestPost],
    },
  {
      routePath: "/api/chat",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_chat_ts_onRequestPost],
    },
  {
      routePath: "/api/digest-send",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_digest_send_ts_onRequestPost],
    },
  {
      routePath: "/api/health",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_health_ts_onRequestGet],
    },
  {
      routePath: "/api/saves",
      mountPath: "/api",
      method: "DELETE",
      middlewares: [],
      modules: [__api_saves_ts_onRequestDelete],
    },
  {
      routePath: "/api/saves",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_saves_ts_onRequestGet],
    },
  {
      routePath: "/api/saves",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_saves_ts_onRequestPost],
    },
  ]