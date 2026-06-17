package com.cashier.server.common;

public class Constants {

    public static final String DEFAULT_PASSWORD = "123456";

    public static final String TOKEN_HEADER = "Authorization";

    public static final String TOKEN_PREFIX = "Bearer ";

    public static final String REDIS_TOKEN_PREFIX = "cashier:token:";

    public static final String REDIS_USER_PREFIX = "cashier:user:";

    public static final String STORE_ID_HEADER = "X-Store-Id";

    public static final String STORE_CODE_HEADER = "X-Store-Code";

    public static final Integer USER_TYPE_CASHIER = 1;

    public static final Integer USER_TYPE_STORE_ADMIN = 2;

    public static final Integer USER_TYPE_HQ_ADMIN = 3;

    public static final String SYNC_TYPE_ORDER = "ORDER";

    public static final String SYNC_TYPE_REFUND = "REFUND";

    public static final String SYNC_TYPE_DAILY_REPORT = "DAILY_REPORT";

    public static final String SYNC_TYPE_SALES_SUMMARY = "SALES_SUMMARY";

    public static final String SYNC_TYPE_STOCK = "STOCK";

    public static final String SYNC_TYPE_MEMBER = "MEMBER";

    public static final String SYNC_TYPE_POINT_RECORD = "POINT_RECORD";

    public static final String SYNC_TYPE_CARD_RECORD = "CARD_RECORD";

    public static final String SYNC_TYPE_INVOICE = "INVOICE";

    public static final String SYNC_TYPE_PRINT_HISTORY = "PRINT_HISTORY";

    public static final String MQ_ORDER_QUEUE = "cashier.order.queue";

    public static final String MQ_PAYMENT_QUEUE = "cashier.payment.queue";

    public static final Integer PAGE_NUM = 1;

    public static final Integer PAGE_SIZE = 10;

    public static final Integer MAX_PAGE_SIZE = 100;
}
