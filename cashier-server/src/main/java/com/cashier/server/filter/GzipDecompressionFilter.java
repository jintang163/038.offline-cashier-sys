package com.cashier.server.filter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ReadListener;
import javax.servlet.ServletInputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import javax.servlet.http.HttpServletResponse;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.zip.GZIPInputStream;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class GzipDecompressionFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(GzipDecompressionFilter.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws IOException {
        try {
            String contentType = request.getContentType();
            if (contentType != null && contentType.contains("application/json")
                    && !"GET".equalsIgnoreCase(request.getMethod())) {

                byte[] originalBody = StreamUtils.copyToByteArray(request.getInputStream());
                if (originalBody.length == 0) {
                    filterChain.doFilter(request, response);
                    return;
                }

                String bodyStr = new String(originalBody, StandardCharsets.UTF_8);

                try {
                    JsonNode root = objectMapper.readTree(bodyStr);
                    if (root.has("_gzip") && root.get("_gzip").asBoolean() && root.has("_payload")) {

                        String base64Payload = root.get("_payload").asText();
                        int originalSize = root.has("_originalSize") ? root.get("_originalSize").asInt() : 0;
                        int compressedSize = root.has("_compressedSize") ? root.get("_compressedSize").asInt() : 0;

                        byte[] compressedBytes = Base64.getDecoder().decode(base64Payload);
                        byte[] decompressedBytes = decompressGzip(compressedBytes);
                        String decompressedStr = new String(decompressedBytes, StandardCharsets.UTF_8);

                        log.info("Gzip decompressed: original={} bytes, compressed={} bytes, ratio={}%",
                                originalSize, compressedSize,
                                originalSize > 0 ? String.format("%.2f", (compressedSize * 100.0) / originalSize) : "N/A");

                        request = new CachedBodyHttpServletRequest(request, decompressedStr.getBytes(StandardCharsets.UTF_8));
                    } else {
                        request = new CachedBodyHttpServletRequest(request, originalBody);
                    }
                } catch (Exception e) {
                    log.debug("Not a gzip wrapped request, passing through: {}", e.getMessage());
                    request = new CachedBodyHttpServletRequest(request, originalBody);
                }
            }

            filterChain.doFilter(request, response);
        } catch (Exception e) {
            log.error("GzipDecompressionFilter error", e);
            filterChain.doFilter(request, response);
        }
    }

    private byte[] decompressGzip(byte[] compressed) throws IOException {
        try (InputStream gis = new GZIPInputStream(new ByteArrayInputStream(compressed))) {
            return StreamUtils.copyToByteArray(gis);
        }
    }

    public static class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {
        private final byte[] cachedBody;

        public CachedBodyHttpServletRequest(HttpServletRequest request, byte[] cachedBody) {
            super(request);
            this.cachedBody = cachedBody;
        }

        @Override
        public ServletInputStream getInputStream() {
            final ByteArrayInputStream byteArrayInputStream = new ByteArrayInputStream(this.cachedBody);
            return new ServletInputStream() {
                @Override
                public boolean isFinished() {
                    return byteArrayInputStream.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener readListener) {
                    throw new UnsupportedOperationException();
                }

                @Override
                public int read() {
                    return byteArrayInputStream.read();
                }
            };
        }

        @Override
        public java.io.BufferedReader getReader() {
            return new java.io.BufferedReader(
                    new java.io.InputStreamReader(this.getInputStream(), StandardCharsets.UTF_8));
        }
    }
}
