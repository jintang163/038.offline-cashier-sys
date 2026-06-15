package com.cashier.server.common;

public class Constants {

    public static final String DEFAULT_PASSWORD = "123456";

    public static final String TOKEN_HEADER = "Authorization";

    public static final String TOKEN_PREFIX = "Bearer ";

    public static final String REDIS_TOKEN_PREFIX = "cashier:token:";

    public static final String REDIS_USER_PREFIX = "cashier:user:";

    public static final String MQ_ORDER_QUEUE = "cashier.order.queue";

    public static final String MQ_PAYMENT_QUEUE = "cashier.payment.queue";

    public static final Integer PAGE_NUM = 1;

    public static final Integer PAGE_SIZE = 10;

    public static final Integer MAX_PAGE_SIZE = 100;
}
