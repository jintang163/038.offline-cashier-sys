package com.cashier.server.websocket;

import com.alibaba.fastjson.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.websocket.*;
import javax.websocket.server.PathParam;
import javax.websocket.server.ServerEndpoint;
import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
@ServerEndpoint("/ws/{clientId}")
public class WebSocketServer {

    private static final Logger log = LoggerFactory.getLogger(WebSocketServer.class);

    private static final ConcurrentHashMap<String, Session> sessionMap = new ConcurrentHashMap<>();

    private static final AtomicInteger onlineCount = new AtomicInteger(0);

    private static WebSocketService webSocketService;

    public static void setWebSocketService(WebSocketService service) {
        webSocketService = service;
    }

    @OnOpen
    public void onOpen(@PathParam("clientId") String clientId, Session session) {
        sessionMap.put(clientId, session);
        onlineCount.incrementAndGet();
        log.info("客户端连接建立: clientId={}, 当前在线数={}", clientId, onlineCount.get());
    }

    @OnClose
    public void onClose(@PathParam("clientId") String clientId) {
        sessionMap.remove(clientId);
        onlineCount.decrementAndGet();
        log.info("客户端连接关闭: clientId={}, 当前在线数={}", clientId, onlineCount.get());
    }

    @OnMessage
    public void onMessage(@PathParam("clientId") String clientId, String message) {
        log.debug("收到客户端消息: clientId={}, message={}", clientId, message);
        try {
            JSONObject json = JSONObject.parseObject(message);
            String type = json.getString("type");

            if ("print_ticket".equals(type)) {
                handlePrintTicket(clientId, json);
            } else if ("ping".equals(type)) {
                JSONObject pong = new JSONObject();
                pong.put("type", "pong");
                pong.put("timestamp", System.currentTimeMillis());
                sendMessage(clientId, pong.toJSONString());
            }
        } catch (Exception e) {
            log.error("处理客户端消息失败: clientId={}", clientId, e);
        }
    }

    @OnError
    public void onError(@PathParam("clientId") String clientId, Throwable error) {
        log.error("WebSocket错误: clientId={}", clientId, error);
    }

    private void handlePrintTicket(String clientId, JSONObject json) {
        JSONObject payload = json.getJSONObject("payload");
        if (payload == null) {
            log.warn("print_ticket消息缺少payload: clientId={}", clientId);
            return;
        }

        String printerCode = payload.getString("printer_code");
        Long printerId = payload.getLong("printer_id");
        Integer copies = payload.getInteger("copies");
        JSONObject content = payload.getJSONObject("content");

        log.info("收到打印请求: clientId={}, printerCode={}, printerId={}, copies={}",
                clientId, printerCode, printerId, copies);

        JSONObject result = new JSONObject();
        result.put("type", "print_result");
        result.put("payload", new JSONObject());
        result.getJSONObject("payload").put("printer_id", printerId);
        result.getJSONObject("payload").put("printer_code", printerCode);
        result.getJSONObject("payload").put("success", true);
        result.put("timestamp", System.currentTimeMillis());

        sendMessage(clientId, result.toJSONString());
        log.info("已回复打印结果: clientId={}, printerCode={}", clientId, printerCode);
    }

    public static boolean sendMessage(String clientId, String message) {
        Session session = sessionMap.get(clientId);
        if (session != null && session.isOpen()) {
            try {
                session.getBasicRemote().sendText(message);
                return true;
            } catch (IOException e) {
                log.error("发送消息失败: clientId={}", clientId, e);
            }
        }
        return false;
    }

    public static void broadcast(String message) {
        for (Session session : sessionMap.values()) {
            if (session.isOpen()) {
                try {
                    session.getBasicRemote().sendText(message);
                } catch (IOException e) {
                    log.error("广播消息失败", e);
                }
            }
        }
    }

    public static int getOnlineCount() {
        return onlineCount.get();
    }

    public static boolean isOnline(String clientId) {
        Session session = sessionMap.get(clientId);
        return session != null && session.isOpen();
    }
}
