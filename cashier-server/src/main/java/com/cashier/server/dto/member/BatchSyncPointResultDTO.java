package com.cashier.server.dto.member;

import lombok.Data;

import java.util.List;

@Data
public class BatchSyncPointResultDTO {

    private Integer successCount;

    private Integer failCount;

    private List<FailRecord> failRecords;

    @Data
    public static class FailRecord {

        private String recordNo;

        private String error;
    }
}
