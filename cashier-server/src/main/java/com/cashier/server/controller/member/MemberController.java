package com.cashier.server.controller.member;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.cashier.server.common.Result;
import com.cashier.server.common.UserContext;
import com.cashier.server.dto.member.*;
import com.cashier.server.entity.member.Member;
import com.cashier.server.entity.member.MemberCard;
import com.cashier.server.entity.member.MemberCardRecord;
import com.cashier.server.entity.member.MemberLevel;
import com.cashier.server.entity.member.PointRule;
import com.cashier.server.service.member.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/member")
public class MemberController {

    @Autowired
    private MemberService memberService;

    @Autowired
    private MemberLevelService memberLevelService;

    @Autowired
    private PointRuleService pointRuleService;

    @Autowired
    private PointRuleEngineService pointRuleEngineService;

    @Autowired
    private PointRecordService pointRecordService;

    @Autowired
    private MemberCardService memberCardService;

    @Autowired
    private MemberCardRecordService memberCardRecordService;

    @GetMapping("/list")
    public Result<IPage<Member>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status) {
        return Result.success(memberService.getMemberList(page, size, keyword, status));
    }

    @GetMapping("/{id}")
    public Result<Member> detail(@PathVariable Long id) {
        return Result.success(memberService.getById(id));
    }

    @GetMapping("/phone/{phone}")
    public Result<Member> getByPhone(@PathVariable String phone) {
        Member member = memberService.getByPhone(phone);
        if (member != null) {
            memberService.updateLastUsedTime(member.getId());
        }
        return Result.success(member);
    }

    @GetMapping("/card/{cardNo}")
    public Result<Member> getByCardNo(@PathVariable String cardNo) {
        Member member = memberService.getByCardNo(cardNo);
        if (member != null) {
            memberService.updateLastUsedTime(member.getId());
        }
        return Result.success(member);
    }

    @PostMapping
    public Result<Void> add(@RequestBody Member member) {
        memberService.save(member);
        return Result.success();
    }

    @PutMapping
    public Result<Void> update(@RequestBody Member member) {
        memberService.updateById(member);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        memberService.removeById(id);
        return Result.success();
    }

    @GetMapping("/sync-list")
    public Result<List<MemberSyncDTO>> getSyncList(
            @RequestParam(required = false) LocalDateTime updateTime,
            @RequestParam(required = false) Integer status) {
        return Result.success(memberService.getSyncList(updateTime, status));
    }

    @GetMapping("/level/list")
    public Result<List<MemberLevel>> listLevels() {
        return Result.success(memberLevelService.listAllEnabled());
    }

    @GetMapping("/point-rule/list")
    public Result<List<PointRule>> listPointRules() {
        return Result.success(pointRuleService.listActiveRules());
    }

    @PostMapping("/point-rule/calculate")
    public Result<CalculatePointsDTO.Response> calculatePoints(@RequestBody CalculatePointsDTO.Request request) {
        return Result.success(pointRuleEngineService.calculate(request));
    }

    @PostMapping("/point/add")
    public Result<Map<String, Object>> addPoints(@RequestBody PointChangeDTO dto) {
        Long userId = UserContext.getCurrentUserId();
        String userName = null;
        if (UserContext.getCurrentUser() != null) {
            userName = UserContext.getCurrentUser().getUsername();
        }
        Map<String, Object> result = memberService.addPoints(
                dto.getMemberId(), dto.getPoints(), dto.getOrderNo(), dto.getRemark(), userId, userName);
        return Result.success(result);
    }

    @PostMapping("/point/deduct")
    public Result<Map<String, Object>> deductPoints(@RequestBody PointChangeDTO dto) {
        Long userId = UserContext.getCurrentUserId();
        String userName = null;
        if (UserContext.getCurrentUser() != null) {
            userName = UserContext.getCurrentUser().getUsername();
        }
        Map<String, Object> result = memberService.deductPoints(
                dto.getMemberId(), dto.getPoints(), dto.getOrderNo(), dto.getRemark(), userId, userName);
        return Result.success(result);
    }

    @PostMapping("/point-record/batch-sync")
    public Result<BatchSyncPointResultDTO> batchSyncPointRecords(@RequestBody List<PointRecordSyncDTO> records) {
        return Result.success(pointRecordService.batchSync(records));
    }

    @GetMapping("/birthday")
    public Result<List<Member>> getBirthdayMembers(@RequestParam(defaultValue = "7") Integer days) {
        return Result.success(memberService.getBirthdayMembers(days));
    }

    @GetMapping("/{memberId}/cards")
    public Result<List<MemberCard>> getMemberCards(@PathVariable Long memberId) {
        return Result.success(memberCardService.getByMemberId(memberId));
    }

    @PostMapping("/card/pay")
    public Result<Map<String, Object>> cardPay(@RequestBody CardPayDTO dto) {
        return Result.success(memberCardService.pay(dto));
    }

    @PostMapping("/card/reserve")
    public Result<Map<String, Object>> cardReserve(@RequestBody CardReserveDTO dto) {
        return Result.success(memberCardService.reserve(dto));
    }

    @PostMapping("/card-record/batch-sync")
    public Result<BatchSyncPointResultDTO> batchSyncCardRecords(@RequestBody List<MemberCardRecordSyncDTO> records) {
        return Result.success(memberCardRecordService.batchSyncCardRecords(records));
    }

    @GetMapping("/card-record/unsynced")
    public Result<List<MemberCardRecord>> getUnsyncedCardRecords(@RequestParam(defaultValue = "100") Integer limit) {
        return Result.success(memberCardRecordService.getUnsyncedRecords(limit));
    }
}
