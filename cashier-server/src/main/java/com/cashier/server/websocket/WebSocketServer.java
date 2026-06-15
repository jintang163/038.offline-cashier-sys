package com.cashier.server.websocket;

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
    }

    @OnError
    public void onError(@PathParam("clientId") String clientId, Throwable error) {
        log.error("WebSocket错误: clientId={}", clientId, error);
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
