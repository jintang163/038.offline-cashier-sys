package com.cashier.server.service.erp;

import cn.hutool.core.date.DateUtil;
import cn.hutool.core.util.StrUtil;
import com.cashier.server.common.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Component
public class ExpressionEngine {

    private static final Logger log = LoggerFactory.getLogger(ExpressionEngine.class);

    public Object execute(String expression, Object value, Map<String, Object> context) {
        if (StrUtil.isBlank(expression) || value == null) {
            return value;
        }
        try {
            String expr = expression.trim();
            if (expr.startsWith("formatDate")) {
                return evalFormatDate(expr, value);
            } else if (expr.startsWith("parseDate")) {
                return evalParseDate(expr, value);
            } else if (expr.startsWith("substring")) {
                return evalSubstring(expr, value);
            } else if (expr.startsWith("concat")) {
                return evalConcat(expr, value, context);
            } else if (expr.startsWith("toNumber")) {
                return evalToNumber(value);
            } else if (expr.startsWith("toString")) {
                return evalToString(value);
            } else if (expr.startsWith("toUpperCase")) {
                return String.valueOf(value).toUpperCase();
            } else if (expr.startsWith("toLowerCase")) {
                return String.valueOf(value).toLowerCase();
            } else if (expr.startsWith("trim")) {
                return String.valueOf(value).trim();
            } else if (expr.startsWith("replace")) {
                return evalReplace(expr, value);
            } else if (expr.startsWith("defaultIfEmpty")) {
                return evalDefaultIfEmpty(expr, value);
            } else if (expr.startsWith("prefix")) {
                return evalPrefix(expr, value);
            } else if (expr.startsWith("suffix")) {
                return evalSuffix(expr, value);
            } else if (expr.startsWith("multiply")) {
                return evalMultiply(expr, value);
            } else if (expr.startsWith("divide")) {
                return evalDivide(expr, value);
            } else if (expr.startsWith("round")) {
                return evalRound(expr, value);
            }
            return value;
        } catch (Exception e) {
            log.warn("表达式执行失败: expression={}, value={}, error={}", expression, value, e.getMessage());
            return value;
        }
    }

    private Object evalFormatDate(String expr, Object value) {
        String pattern = extractParam(expr, "formatDate");
        if (StrUtil.isBlank(pattern)) {
            pattern = "yyyy-MM-dd HH:mm:ss";
        }
        if (value instanceof LocalDateTime) {
            return ((LocalDateTime) value).format(DateTimeFormatter.ofPattern(pattern));
        } else if (value instanceof java.util.Date) {
            return DateUtil.format((java.util.Date) value, pattern);
        }
        return value.toString();
    }

    private Object evalParseDate(String expr, Object value) {
        String pattern = extractParam(expr, "parseDate");
        if (StrUtil.isBlank(pattern)) {
            pattern = "yyyy-MM-dd HH:mm:ss";
        }
        return LocalDateTime.parse(value.toString(), DateTimeFormatter.ofPattern(pattern));
    }

    private Object evalSubstring(String expr, Object value) {
        String params = extractParam(expr, "substring");
        if (StrUtil.isBlank(params)) {
            return value.toString();
        }
        String[] parts = params.split(",");
        int start = Integer.parseInt(parts[0].trim());
        int end = parts.length > 1 ? Integer.parseInt(parts[1].trim()) : value.toString().length();
        String str = value.toString();
        if (start < 0) start = 0;
        if (end > str.length()) end = str.length();
        return str.substring(start, end);
    }

    private Object evalConcat(String expr, Object value, Map<String, Object> context) {
        String params = extractParam(expr, "concat");
        if (StrUtil.isBlank(params)) {
            return value.toString();
        }
        StringBuilder sb = new StringBuilder(value.toString());
        String[] parts = params.split(",");
        for (String part : parts) {
            String p = part.trim();
            if (p.startsWith("'") && p.endsWith("'")) {
                sb.append(p.substring(1, p.length() - 1));
            } else if (context != null && context.containsKey(p)) {
                sb.append(context.get(p));
            }
        }
        return sb.toString();
    }

    private Object evalToNumber(Object value) {
        if (value instanceof Number) {
            return value;
        }
        String str = value.toString().trim();
        if (str.contains(".")) {
            return new BigDecimal(str);
        }
        try {
            return Long.parseLong(str);
        } catch (NumberFormatException e) {
            return new BigDecimal(str);
        }
    }

    private Object evalToString(Object value) {
        return value.toString();
    }

    private Object evalReplace(String expr, Object value) {
        String params = extractParam(expr, "replace");
        if (StrUtil.isBlank(params)) {
            return value.toString();
        }
        String[] parts = params.split(",");
        if (parts.length >= 2) {
            String target = parts[0].trim();
            String replacement = parts[1].trim();
            if (target.startsWith("'") && target.endsWith("'")) {
                target = target.substring(1, target.length() - 1);
            }
            if (replacement.startsWith("'") && replacement.endsWith("'")) {
                replacement = replacement.substring(1, replacement.length() - 1);
            }
            return value.toString().replace(target, replacement);
        }
        return value.toString();
    }

    private Object evalDefaultIfEmpty(String expr, Object value) {
        if (value == null || StrUtil.isBlank(value.toString())) {
            String defaultValue = extractParam(expr, "defaultIfEmpty");
            if (defaultValue.startsWith("'") && defaultValue.endsWith("'")) {
                return defaultValue.substring(1, defaultValue.length() - 1);
            }
            return defaultValue;
        }
        return value;
    }

    private Object evalPrefix(String expr, Object value) {
        String prefix = extractParam(expr, "prefix");
        if (prefix.startsWith("'") && prefix.endsWith("'")) {
            prefix = prefix.substring(1, prefix.length() - 1);
        }
        return prefix + value.toString();
    }

    private Object evalSuffix(String expr, Object value) {
        String suffix = extractParam(expr, "suffix");
        if (suffix.startsWith("'") && suffix.endsWith("'")) {
            suffix = suffix.substring(1, suffix.length() - 1);
        }
        return value.toString() + suffix;
    }

    private Object evalMultiply(String expr, Object value) {
        String factorStr = extractParam(expr, "multiply");
        BigDecimal factor = new BigDecimal(factorStr.trim());
        BigDecimal num = value instanceof BigDecimal ? (BigDecimal) value : new BigDecimal(value.toString());
        return num.multiply(factor);
    }

    private Object evalDivide(String expr, Object value) {
        String divisorStr = extractParam(expr, "divide");
        BigDecimal divisor = new BigDecimal(divisorStr.trim());
        if (divisor.compareTo(BigDecimal.ZERO) == 0) {
            throw new BusinessException("除数不能为0");
        }
        BigDecimal num = value instanceof BigDecimal ? (BigDecimal) value : new BigDecimal(value.toString());
        return num.divide(divisor, 6, BigDecimal.ROUND_HALF_UP);
    }

    private Object evalRound(String expr, Object value) {
        String scaleStr = extractParam(expr, "round");
        int scale = Integer.parseInt(scaleStr.trim());
        BigDecimal num = value instanceof BigDecimal ? (BigDecimal) value : new BigDecimal(value.toString());
        return num.setScale(scale, BigDecimal.ROUND_HALF_UP);
    }

    private String extractParam(String expr, String functionName) {
        int start = expr.indexOf('(');
        int end = expr.lastIndexOf(')');
        if (start > 0 && end > start) {
            return expr.substring(start + 1, end).trim();
        }
        return "";
    }
}
