package com.cashier.server.controller.fraud;

import com.cashier.server.common.Result;
import com.cashier.server.engine.FraudAnalysisEngine;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/fraud/analysis")
public class FraudAnalysisController {

    @Autowired
    private FraudAnalysisEngine fraudAnalysisEngine;

    @GetMapping("/overview")
    public Result<Map<String, Object>> getOverview() {
        return Result.success(fraudAnalysisEngine.getFraudOverview());
    }

    @PostMapping("/analyze-all")
    public Result<Void> analyzeAllStores() {
        fraudAnalysisEngine.analyzeAllStores();
        return Result.success();
    }
}
