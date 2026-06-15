package com.cashier.server.controller.websocket;

import com.cashier.server.common.Result;
import com.cashier.server.websocket.WebSocketService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/ws")
public class WebSocketController {

    @Autowired
    private WebSocketService webSocketService;

    @GetMapping("/online-count")
    public Result<Map<String, Object>> getOnlineCount() {
        Map<String, Object> result = new HashMap<>();
        result.put("onlineCount", webSocketService.getOnlineCount());
        return Result.success(result);
    }

    @GetMapping("/client/{clientId}/online")
    public Result<Map<String, Object>> isClientOnline(@PathVariable String clientId) {
        Map<String, Object> result = new HashMap<>();
        result.put("clientId", clientId);
        result.put("online", webSocketService.isClientOnline(clientId));
        return Result.success(result);
    }

    @PostMapping("/broadcast/product")
    public Result<Void> broadcastProductUpdate(@RequestParam String message) {
        webSocketService.broadcastProductUpdate(message);
        return Result.success();
    }

    @PostMapping("/broadcast/stock")
    public Result<Void> broadcastStockUpdate(@RequestParam String message) {
        webSocketService.broadcastStockUpdate(message);
        return Result.success();
    }

    @PostMapping("/broadcast/order-sync")
    public Result<Void> broadcastOrderSyncUpdate(@RequestParam String message) {
        webSocketService.broadcastOrderSyncUpdate(message);
        return Result.success();
    }

    @PostMapping("/broadcast/network")
    public Result<Void> broadcastNetworkStatus(@RequestParam boolean online) {
        webSocketService.broadcastNetworkStatus(online);
        return Result.success();
    }

    @PostMapping("/send/{clientId}")
    public Result<Void> sendToClient(
            @PathVariable String clientId,
            @RequestParam String type,
            @RequestParam String message) {
        webSocketService.sendToClient(clientId, type, message);
        return Result.success();
    }
}
