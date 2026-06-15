package com.cashier.server.websocket;

import com.alibaba.fastjson.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class WebSocketService {

    private static final Logger log = LoggerFactory.getLogger(WebSocketService.class);

    public void broadcastProductUpdate(Object data) {
        JSONObject json = new JSONObject();
        json.put("type", "product_update");
        json.put("data", data);
        json.put("timestamp", System.currentTimeMillis());
        WebSocketServer.broadcast(json.toJSONString());
        log.info("广播商品更新通知");
    }

    public void broadcastStockUpdate(Object data) {
        JSONObject json = new JSONObject();
        json.put("type", "stock_update");
        json.put("data", data);
        json.put("timestamp", System.currentTimeMillis());
        WebSocketServer.broadcast(json.toJSONString());
        log.info("广播库存更新通知");
    }

    public void broadcastOrderSyncUpdate(Object data) {
        JSONObject json = new JSONObject();
        json.put("type", "order_sync_update");
        json.put("data", data);
        json.put("timestamp", System.currentTimeMillis());
        WebSocketServer.broadcast(json.toJSONString());
        log.info("广播订单同步更新通知");
    }

    public void broadcastNetworkStatus(boolean online) {
        JSONObject json = new JSONObject();
        json.put("type", "network_status");
        json.put("online", online);
        json.put("timestamp", System.currentTimeMillis());
        WebSocketServer.broadcast(json.toJSONString());
        log.info("广播网络状态通知: online={}", online);
    }

    public void sendToClient(String clientId, String type, String message) {
        JSONObject json = new JSONObject();
        json.put("type", type);
        json.put("message", message);
        json.put("timestamp", System.currentTimeMillis());
        WebSocketServer.sendMessage(clientId, json.toJSONString());
    }

    public int getOnlineCount() {
        return WebSocketServer.getOnlineCount();
    }

    public boolean isClientOnline(String clientId) {
        return WebSocketServer.isOnline(clientId);
    }
}
