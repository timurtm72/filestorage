package com.example.filestorage;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "spring.sql.init.mode=never")
class FileStorageApplicationTests {

    @Test
    void contextLoads() {
    }

}
