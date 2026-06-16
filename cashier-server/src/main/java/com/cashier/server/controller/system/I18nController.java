package com.cashier.server.controller.system;

import com.cashier.server.common.Result;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/i18n")
public class I18nController {

    private static final Map<String, String> SUPPORTED_LANGUAGES = new LinkedHashMap<>();

    static {
        SUPPORTED_LANGUAGES.put("zh-CN", "简体中文");
        SUPPORTED_LANGUAGES.put("en-US", "English");
        SUPPORTED_LANGUAGES.put("ja-JP", "日本語");
    }

    @GetMapping("/languages")
    public Result<Map<String, Object>> getSupportedLanguages() {
        Map<String, Object> result = new HashMap<>();
        List<Map<String, Object>> languages = new ArrayList<>();

        for (Map.Entry<String, String> entry : SUPPORTED_LANGUAGES.entrySet()) {
            Map<String, Object> lang = new HashMap<>();
            lang.put("code", entry.getKey());
            lang.put("name", entry.getValue());
            languages.add(lang);
        }

        result.put("languages", languages);
        result.put("default", "zh-CN");
        return Result.success(result);
    }

    @GetMapping("/translations/{lang}")
    public Result<Map<String, Object>> getTranslations(@PathVariable String lang) {
        if (!SUPPORTED_LANGUAGES.containsKey(lang)) {
            return Result.fail("不支持的语言: " + lang);
        }
        Map<String, Object> translations = buildTranslations(lang);
        return Result.success(translations);
    }

    @GetMapping("/all")
    public Result<Map<String, Object>> getAllTranslations() {
        Map<String, Object> allTranslations = new HashMap<>();
        for (String lang : SUPPORTED_LANGUAGES.keySet()) {
            allTranslations.put(lang, buildTranslations(lang));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("languages", SUPPORTED_LANGUAGES);
        result.put("translations", allTranslations);
        result.put("default", "zh-CN");

        return Result.success(result);
    }

    private Map<String, Object> buildTranslations(String lang) {
        Map<String, Object> translations = new HashMap<>();

        if ("zh-CN".equals(lang)) {
            buildZhCnTranslations(translations);
        } else if ("en-US".equals(lang)) {
            buildEnUsTranslations(translations);
        } else if ("ja-JP".equals(lang)) {
            buildJaJpTranslations(translations);
        }

        return translations;
    }

    private void buildZhCnTranslations(Map<String, Object> t) {
        Map<String, String> common = new HashMap<>();
        common.put("confirm", "确认");
        common.put("cancel", "取消");
        common.put("save", "保存");
        common.put("delete", "删除");
        common.put("edit", "编辑");
        common.put("search", "搜索");
        common.put("loading", "加载中...");
        common.put("success", "操作成功");
        common.put("fail", "操作失败");
        common.put("retry", "重试");
        common.put("back", "返回");
        common.put("home", "首页");
        common.put("settings", "设置");
        common.put("language", "语言");
        common.put("currency", "货币");
        common.put("total", "合计");
        common.put("quantity", "数量");
        common.put("price", "价格");
        common.put("amount", "金额");
        common.put("payment", "支付");
        common.put("cash", "现金");
        common.put("change", "找零");
        common.put("submit", "提交");
        t.put("common", common);

        Map<String, String> order = new HashMap<>();
        order.put("order", "订单");
        order.put("orderNo", "订单号");
        order.put("orderDetail", "订单详情");
        order.put("orderList", "订单列表");
        order.put("createOrder", "创建订单");
        order.put("tableNumber", "桌号");
        order.put("peopleCount", "人数");
        order.put("remark", "备注");
        order.put("totalAmount", "总金额");
        order.put("payAmount", "应付金额");
        order.put("discountAmount", "优惠金额");
        order.put("orderSuccess", "下单成功");
        order.put("orderFail", "下单失败");
        order.put("pendingPayment", "待支付");
        order.put("paid", "已支付");
        order.put("cancelled", "已取消");
        t.put("order", order);

        Map<String, String> payment = new HashMap<>();
        payment.put("payMethod", "支付方式");
        payment.put("cashPayment", "现金支付");
        payment.put("wechatPay", "微信支付");
        payment.put("alipay", "支付宝");
        payment.put("cardPayment", "银行卡");
        payment.put("foreignCurrency", "外币支付");
        payment.put("exchangeRate", "汇率");
        payment.put("receivedAmount", "收到金额");
        payment.put("changeAmount", "找零金额");
        payment.put("convertedAmount", "换算后金额");
        payment.put("paySuccess", "支付成功");
        payment.put("payFail", "支付失败");
        payment.put("selectCurrency", "选择货币");
        t.put("payment", payment);

        Map<String, String> stockCheck = new HashMap<>();
        stockCheck.put("stockCheck", "库存盘点");
        stockCheck.put("taskList", "任务列表");
        stockCheck.put("taskDetail", "任务详情");
        stockCheck.put("downloadTask", "下载任务");
        stockCheck.put("uploadData", "上传数据");
        stockCheck.put("scanCheck", "扫码盘点");
        stockCheck.put("syncFromErp", "ERP同步");
        stockCheck.put("calculateDiff", "计算差异");
        stockCheck.put("completeProcess", "一键完成");
        stockCheck.put("processing", "处理中...");
        stockCheck.put("uploadComplete", "上传完成");
        stockCheck.put("diffCount", "差异商品数");
        stockCheck.put("lossReport", "报损单");
        stockCheck.put("adjustOrder", "调整单");
        stockCheck.put("erpSync", "ERP同步");
        t.put("stockCheck", stockCheck);

        Map<String, String> network = new HashMap<>();
        network.put("online", "在线");
        network.put("offline", "离线");
        network.put("networkError", "网络异常");
        network.put("noNetwork", "当前无网络，请检查网络连接");
        network.put("syncWhenOnline", "网络恢复后自动同步");
        t.put("network", network);

        Map<String, String> message = new HashMap<>();
        message.put("cartEmpty", "购物车是空的");
        message.put("selectTable", "请选择桌号");
        message.put("dataSaved", "数据已保存");
        message.put("dataSynced", "数据已同步");
        message.put("downloadSuccess", "下载成功");
        message.put("uploadSuccess", "上传成功");
        message.put("currencyNotSupported", "不支持该货币");
        message.put("languageChanged", "语言已切换");
        t.put("message", message);
    }

    private void buildEnUsTranslations(Map<String, Object> t) {
        Map<String, String> common = new HashMap<>();
        common.put("confirm", "Confirm");
        common.put("cancel", "Cancel");
        common.put("save", "Save");
        common.put("delete", "Delete");
        common.put("edit", "Edit");
        common.put("search", "Search");
        common.put("loading", "Loading...");
        common.put("success", "Success");
        common.put("fail", "Failed");
        common.put("retry", "Retry");
        common.put("back", "Back");
        common.put("home", "Home");
        common.put("settings", "Settings");
        common.put("language", "Language");
        common.put("currency", "Currency");
        common.put("total", "Total");
        common.put("quantity", "Qty");
        common.put("price", "Price");
        common.put("amount", "Amount");
        common.put("payment", "Payment");
        common.put("cash", "Cash");
        common.put("change", "Change");
        common.put("submit", "Submit");
        t.put("common", common);

        Map<String, String> order = new HashMap<>();
        order.put("order", "Order");
        order.put("orderNo", "Order No.");
        order.put("orderDetail", "Order Detail");
        order.put("orderList", "Order List");
        order.put("createOrder", "Create Order");
        order.put("tableNumber", "Table");
        order.put("peopleCount", "Guests");
        order.put("remark", "Remark");
        order.put("totalAmount", "Total");
        order.put("payAmount", "Amount Due");
        order.put("discountAmount", "Discount");
        order.put("orderSuccess", "Order Placed");
        order.put("orderFail", "Order Failed");
        order.put("pendingPayment", "Pending");
        order.put("paid", "Paid");
        order.put("cancelled", "Cancelled");
        t.put("order", order);

        Map<String, String> payment = new HashMap<>();
        payment.put("payMethod", "Payment Method");
        payment.put("cashPayment", "Cash");
        payment.put("wechatPay", "WeChat Pay");
        payment.put("alipay", "Alipay");
        payment.put("cardPayment", "Credit Card");
        payment.put("foreignCurrency", "Foreign Currency");
        payment.put("exchangeRate", "Exchange Rate");
        payment.put("receivedAmount", "Received");
        payment.put("changeAmount", "Change");
        payment.put("convertedAmount", "Converted");
        payment.put("paySuccess", "Payment Successful");
        payment.put("payFail", "Payment Failed");
        payment.put("selectCurrency", "Select Currency");
        t.put("payment", payment);

        Map<String, String> stockCheck = new HashMap<>();
        stockCheck.put("stockCheck", "Stock Check");
        stockCheck.put("taskList", "Task List");
        stockCheck.put("taskDetail", "Task Detail");
        stockCheck.put("downloadTask", "Download");
        stockCheck.put("uploadData", "Upload");
        stockCheck.put("scanCheck", "Scan");
        stockCheck.put("syncFromErp", "ERP Sync");
        stockCheck.put("calculateDiff", "Calculate Diff");
        stockCheck.put("completeProcess", "Complete All");
        stockCheck.put("processing", "Processing...");
        stockCheck.put("uploadComplete", "Upload Complete");
        stockCheck.put("diffCount", "Diff Items");
        stockCheck.put("lossReport", "Loss Report");
        stockCheck.put("adjustOrder", "Adjust Order");
        stockCheck.put("erpSync", "ERP Sync");
        t.put("stockCheck", stockCheck);

        Map<String, String> network = new HashMap<>();
        network.put("online", "Online");
        network.put("offline", "Offline");
        network.put("networkError", "Network Error");
        network.put("noNetwork", "No network, please check connection");
        network.put("syncWhenOnline", "Will sync when online");
        t.put("network", network);

        Map<String, String> message = new HashMap<>();
        message.put("cartEmpty", "Cart is empty");
        message.put("selectTable", "Please select table");
        message.put("dataSaved", "Data saved");
        message.put("dataSynced", "Data synced");
        message.put("downloadSuccess", "Download complete");
        message.put("uploadSuccess", "Upload complete");
        message.put("currencyNotSupported", "Currency not supported");
        message.put("languageChanged", "Language changed");
        t.put("message", message);
    }

    private void buildJaJpTranslations(Map<String, Object> t) {
        Map<String, String> common = new HashMap<>();
        common.put("confirm", "確認");
        common.put("cancel", "キャンセル");
        common.put("save", "保存");
        common.put("delete", "削除");
        common.put("edit", "編集");
        common.put("search", "検索");
        common.put("loading", "読み込み中...");
        common.put("success", "成功");
        common.put("fail", "失敗");
        common.put("retry", "再試行");
        common.put("back", "戻る");
        common.put("home", "ホーム");
        common.put("settings", "設定");
        common.put("language", "言語");
        common.put("currency", "通貨");
        common.put("total", "合計");
        common.put("quantity", "数量");
        common.put("price", "価格");
        common.put("amount", "金額");
        common.put("payment", "お支払い");
        common.put("cash", "現金");
        common.put("change", "お釣り");
        common.put("submit", "送信");
        t.put("common", common);

        Map<String, String> order = new HashMap<>();
        order.put("order", "注文");
        order.put("orderNo", "注文番号");
        order.put("orderDetail", "注文詳細");
        order.put("orderList", "注文一覧");
        order.put("createOrder", "注文作成");
        order.put("tableNumber", "テーブル");
        order.put("peopleCount", "人数");
        order.put("remark", "備考");
        order.put("totalAmount", "合計金額");
        order.put("payAmount", "お支払い金額");
        order.put("discountAmount", "割引金額");
        order.put("orderSuccess", "注文完了");
        order.put("orderFail", "注文失敗");
        order.put("pendingPayment", "支払待ち");
        order.put("paid", "支払済み");
        order.put("cancelled", "キャンセル");
        t.put("order", order);

        Map<String, String> payment = new HashMap<>();
        payment.put("payMethod", "お支払い方法");
        payment.put("cashPayment", "現金");
        payment.put("wechatPay", "WeChat Pay");
        payment.put("alipay", "Alipay");
        payment.put("cardPayment", "クレジットカード");
        payment.put("foreignCurrency", "外貨");
        payment.put("exchangeRate", "為替レート");
        payment.put("receivedAmount", "お預かり");
        payment.put("changeAmount", "お釣り");
        payment.put("convertedAmount", "換算後");
        payment.put("paySuccess", "支払完了");
        payment.put("payFail", "支払失敗");
        payment.put("selectCurrency", "通貨選択");
        t.put("payment", payment);

        Map<String, String> stockCheck = new HashMap<>();
        stockCheck.put("stockCheck", "棚卸し");
        stockCheck.put("taskList", "タスク一覧");
        stockCheck.put("taskDetail", "タスク詳細");
        stockCheck.put("downloadTask", "ダウンロード");
        stockCheck.put("uploadData", "アップロード");
        stockCheck.put("scanCheck", "スキャン");
        stockCheck.put("syncFromErp", "ERP同期");
        stockCheck.put("calculateDiff", "差異計算");
        stockCheck.put("completeProcess", "一括完了");
        stockCheck.put("processing", "処理中...");
        stockCheck.put("uploadComplete", "アップロード完了");
        stockCheck.put("diffCount", "差異品数");
        stockCheck.put("lossReport", "損失報告");
        stockCheck.put("adjustOrder", "調整伝票");
        stockCheck.put("erpSync", "ERP同期");
        t.put("stockCheck", stockCheck);

        Map<String, String> network = new HashMap<>();
        network.put("online", "オンライン");
        network.put("offline", "オフライン");
        network.put("networkError", "ネットワークエラー");
        network.put("noNetwork", "ネットワークに接続できません");
        network.put("syncWhenOnline", "オンライン時に自動同期");
        t.put("network", network);

        Map<String, String> message = new HashMap<>();
        message.put("cartEmpty", "カートは空です");
        message.put("selectTable", "テーブルを選択してください");
        message.put("dataSaved", "データ保存済み");
        message.put("dataSynced", "データ同期済み");
        message.put("downloadSuccess", "ダウンロード完了");
        message.put("uploadSuccess", "アップロード完了");
        message.put("currencyNotSupported", "この通貨はサポートされていません");
        message.put("languageChanged", "言語を変更しました");
        t.put("message", message);
    }
}
