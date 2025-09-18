-- MySQL dump 10.13  Distrib 5.7.24, for osx11.1 (x86_64)
--
-- Host: mysql-25e07224-coffee-9e39.d.aivencloud.com    Database: defaultdb
-- ------------------------------------------------------
-- Server version	8.0.35

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED='4db99954-8df7-11f0-ae20-a225ab131496:1-844,
b51b3276-88ac-11f0-817e-8ebfe8c7a1d7:1-27';

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('4856f6aa-a834-42e4-b603-086edf3af78c','6783fd8bac418a4323e9fed58a9841fe80f2b238221e640fab901694438c8e30','2025-08-28 10:58:09.840','20250826110221_migration_production_26_aug',NULL,NULL,'2025-08-28 10:58:07.808',1),('9cdd77f0-63ae-420d-bc3b-d607627acff1','56657c69069b9db6dadc45cdca0288f151423c16825994fa8d6a5e739012b525','2025-08-28 10:58:09.958','20250827102659_add_max_storage_locations_to_subscription_plans',NULL,NULL,'2025-08-28 10:58:09.877',1),('da55a884-3f8d-4c1b-b68b-e0d1d055e7c8','035d3fac62d9e3d5f7ebc663cfd894db543e1aeea903535e5d1bdd0c0b65a829','2025-08-28 10:58:15.675','20250828105815_add_recipe_product_limits',NULL,NULL,'2025-08-28 10:58:15.592',1),('e5340cc9-5a16-40fb-bf73-bea5371d949e','722dabffc74f638c6e81c0ec90cd4ba103cbc8b746ea6b84dd2538907208a63d','2025-08-28 14:43:50.618','20250828144350_update_recipe_text_fields',NULL,NULL,'2025-08-28 14:43:50.451',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `accounts`
--

DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `accounts` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `providerAccountId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `refresh_token` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `access_token` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expires_at` int DEFAULT NULL,
  `token_type` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scope` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_token` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `session_state` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `accounts_provider_providerAccountId_key` (`provider`,`providerAccountId`),
  KEY `accounts_userId_fkey` (`userId`),
  CONSTRAINT `accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accounts`
--

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activity_logs`
--

DROP TABLE IF EXISTS `activity_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `activity_logs` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activityType` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json NOT NULL,
  `ipAddress` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userAgent` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resourceId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resourceType` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timestamp` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `activity_logs_tenantId_timestamp_idx` (`tenantId`,`timestamp`),
  KEY `activity_logs_userId_timestamp_idx` (`userId`,`timestamp`),
  KEY `activity_logs_activityType_timestamp_idx` (`activityType`,`timestamp`),
  CONSTRAINT `activity_logs_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `activity_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity_logs`
--

LOCK TABLES `activity_logs` WRITE;
/*!40000 ALTER TABLE `activity_logs` DISABLE KEYS */;
INSERT INTO `activity_logs` VALUES ('cmevf1ckb005ljvxuff2rgd0h','cmevaj0ss0000gdnahrsnggin','cmevaj1ip0004gdnaukrriooo','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 13:04:31.449','2025-08-28 13:04:31.451'),('cmevflyp2000t14p7iy6oljzd','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 13:20:33.254','2025-08-28 13:20:33.255'),('cmevfo45d000v14p789oz9i7d','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 13:22:13.632','2025-08-28 13:22:13.633'),('cmevfocnu000x14p7t8rb0r85','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 13:22:24.665','2025-08-28 13:22:24.666'),('cmevfplaq000z14p7erovzema','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 13:23:22.513','2025-08-28 13:23:22.514'),('cmevfpya5001114p7sq906l8u','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 13:23:39.339','2025-08-28 13:23:39.340'),('cmevg9edc0001dupzw03tnq7u','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 13:38:46.655','2025-08-28 13:38:46.655'),('cmevg9mrf0003dupz404kz9hx','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 13:38:57.531','2025-08-28 13:38:57.532'),('cmevhcx460001pjz2qtq8usjc','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 14:09:30.533','2025-08-28 14:09:30.534'),('cmevhov65000bpjz2bhuresj1','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 14:18:47.884','2025-08-28 14:18:47.885'),('cmevhp26y000dpjz2a1jw9a7j','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 14:18:56.984','2025-08-28 14:18:56.987'),('cmevi0jbv000fpjz20w98572f','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 14:27:52.409','2025-08-28 14:27:52.411'),('cmevj5p430001szyvg2s8gu9q','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 14:59:52.801','2025-08-28 14:59:52.803'),('cmevj6vwr0003szyv1zdsbvcp','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-28 15:00:48.266','2025-08-28 15:00:48.267'),('cmew6kv9o0001x61usuccy4g3','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-29 01:55:31.786','2025-08-29 01:55:31.787'),('cmewhrjbf00139ymqbk51hq9z','cmewhr798000b9ymqquz57ln7','cmewhr7dn000f9ymq513xxxy4','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-29 07:08:38.666','2025-08-29 07:08:38.667'),('cmewikioh001r9ymqg82qu457','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-29 07:31:10.864','2025-08-29 07:31:10.866'),('cmewiqr6r001t9ymqw8ealyhx','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-29 07:36:01.826','2025-08-29 07:36:01.827'),('cmewlk79a001v9ymqsojsqij9','cmewhr798000b9ymqquz57ln7','cmewhr7dn000f9ymq513xxxy4','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-29 08:54:54.909','2025-08-29 08:54:54.910'),('cmewlng9n001x9ymq1v4t19x2','cmevaj0ss0000gdnahrsnggin','cmevaj1ip0004gdnaukrriooo','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-29 08:57:26.553','2025-08-29 08:57:26.555'),('cmewlocft001z9ymqc8d8t724','cmewhr798000b9ymqquz57ln7','cmewhr7dn000f9ymq513xxxy4','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-29 08:58:08.248','2025-08-29 08:58:08.249'),('cmewnr5wh002d9ymqaeykt6bf','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-29 09:56:18.976','2025-08-29 09:56:18.977'),('cmewo8v140001szmgdv2x4pd6','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-29 10:10:04.696','2025-08-29 10:10:04.697'),('cmewppiho0001j222ipi19y32','cmevaj0ss0000gdnahrsnggin','cmevaj1ip0004gdnaukrriooo','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-29 10:51:01.211','2025-08-29 10:51:01.212'),('cmey5i9xv00014d7ouhj68znt','cmevaj0ss0000gdnahrsnggin','cmevaj1ip0004gdnaukrriooo','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-30 11:01:03.567','2025-08-30 11:01:03.569'),('cmey71er70001kp8lodj0slv6','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-30 11:43:55.889','2025-08-30 11:43:55.890'),('cmeyb2rsj0006kp8lt76357lu','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-30 13:36:57.906','2025-08-30 13:36:57.907'),('cmeyb345e0008kp8l3ucnvsjl','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-30 13:37:13.922','2025-08-30 13:37:13.922'),('cmeyc45a5000dkp8lvz2kwozv','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-30 14:06:01.659','2025-08-30 14:06:01.660'),('cmeycfarb000fkp8ltdmpb3di','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-08-30 14:14:41.974','2025-08-30 14:14:41.975'),('cmf0kwvsd0001cux4fddou0ap','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 03:47:51.660','2025-09-01 03:47:51.661'),('cmf0l8nuj0003cux4esf1s7ic','cmevaj0ss0000gdnahrsnggin','cmevaj1ip0004gdnaukrriooo','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 03:57:01.242','2025-09-01 03:57:01.243'),('cmf0l90hp0005cux4gr7h3q8l','cmewhr798000b9ymqquz57ln7','cmewhr7dn000f9ymq513xxxy4','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 03:57:17.628','2025-09-01 03:57:17.629'),('cmf108jci0001ydm2cckhqjyq','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 10:56:49.647','2025-09-01 10:56:49.650'),('cmf10g4hw0003ydm284skp24w','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 11:02:43.651','2025-09-01 11:02:43.653'),('cmf11kfep0005ydm2hur7e06g','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 11:34:04.032','2025-09-01 11:34:04.033'),('cmf16dtqg0001w4lyg2nf3d6y','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 13:48:54.086','2025-09-01 13:48:54.087'),('cmf16nemj0009w4ly50t3u9x9','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 13:56:21.065','2025-09-01 13:56:21.067'),('cmf16t078000kw4lyl6vwwnso','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 14:00:42.307','2025-09-01 14:00:42.308'),('cmf16uv5r000mw4ly36y8n5gq','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 14:02:09.086','2025-09-01 14:02:09.087'),('cmf174xsr0001dpmu36nodtib','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 14:09:59.064','2025-09-01 14:09:59.065'),('cmf1759yq0003dpmumkiwqtbw','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 14:10:14.833','2025-09-01 14:10:14.834'),('cmf179w4b000edpmuz1pr92dd','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 14:13:50.170','2025-09-01 14:13:50.171'),('cmf17fe32000mdpmu7uiu0wig','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-01 14:18:06.733','2025-09-01 14:18:06.734'),('cmf1y6ttw0004h8xjjq8rx9u5','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 02:47:16.867','2025-09-02 02:47:16.868'),('cmf1zxe7m0006h8xjf9zppzmk','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 03:35:55.953','2025-09-02 03:35:55.954'),('cmf1zyalp0008h8xjg0kd76a5','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 03:36:37.932','2025-09-02 03:36:37.933'),('cmf2019zp000ah8xja1im1nnt','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 03:38:57.108','2025-09-02 03:38:57.109'),('cmf206upn000ch8xj3qhfjvxp','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 03:43:17.241','2025-09-02 03:43:17.243'),('cmf209iic000eh8xjcd5reat5','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 03:45:21.395','2025-09-02 03:45:21.396'),('cmf209rkw000gh8xjm8d12de3','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 03:45:33.151','2025-09-02 03:45:33.152'),('cmf20b2wz000ih8xj9neiwsjd','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 03:46:34.498','2025-09-02 03:46:34.498'),('cmf20ebtn000kh8xj9vekjxar','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 03:49:06.009','2025-09-02 03:49:06.010'),('cmf20eut6000mh8xjfdplqr2z','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 03:49:30.616','2025-09-02 03:49:30.617'),('cmf2118w8000oh8xjykemmc1a','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 04:06:55.303','2025-09-02 04:06:55.304'),('cmf2128hz000qh8xjsd7nlp5u','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 04:07:41.445','2025-09-02 04:07:41.447'),('cmf212lfr000sh8xj03fqn5qc','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 04:07:58.214','2025-09-02 04:07:58.215'),('cmf22ek11001lh8xjgjgxqrsf','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 04:45:15.876','2025-09-02 04:45:15.877'),('cmf29httk0001lrfmd8nla6dl','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 08:03:45.845','2025-09-02 08:03:45.846'),('cmf29is8l0003lrfm1boumteq','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 08:04:30.452','2025-09-02 08:04:30.453'),('cmf2b1zpd0005lrfmrolahsgw','cmevaj0ss0000gdnahrsnggin','cmevaj1ip0004gdnaukrriooo','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 08:47:26.207','2025-09-02 08:47:26.209'),('cmf2b9dd40007lrfmpheekoly','cmevaj0ss0000gdnahrsnggin','cmevaj1ip0004gdnaukrriooo','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 08:53:10.501','2025-09-02 08:53:10.503'),('cmf2bnu480009lrfmngj7yons','cmevaj0ss0000gdnahrsnggin','cmevaj1ip0004gdnaukrriooo','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 09:04:25.397','2025-09-02 09:04:25.400'),('cmf2ch7o2000blrfmuhqjysxs','cmewhr798000b9ymqquz57ln7','cmewhr7dn000f9ymq513xxxy4','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 09:27:15.984','2025-09-02 09:27:15.986'),('cmf2k34f2000113xj52cbuopn','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 13:00:15.517','2025-09-02 13:00:15.518'),('cmf2ku4ya0001404ciuktximu','cmewhr798000b9ymqquz57ln7','cmewhr7dn000f9ymq513xxxy4','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 13:21:15.921','2025-09-02 13:21:15.922'),('cmf2kviih0003404c94l2ucoy','cmevflj4h000114p722ucja4t','cmevflj8v000514p7hlb974gs','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-02 13:22:20.153','2025-09-02 13:22:20.153'),('cmf548fhy0001nfpqaje8g0va','cmewhr798000b9ymqquz57ln7','cmewhr7dn000f9ymq513xxxy4','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-04 07:59:47.828','2025-09-04 07:59:47.829'),('cmf54dntx000cnfpqivr6i38j','cmevaj0ss0000gdnahrsnggin','cmevaj1ip0004gdnaukrriooo','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-04 08:03:51.908','2025-09-04 08:03:51.909'),('cmfdhbwqp0001botpnc99apvl','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-10 04:28:34.559','2025-09-10 04:28:34.560'),('cmfdhclky0003botpgjuongxs','cmevaj0ss0000gdnahrsnggin','cmevaj1pr0008gdna8ind9917','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-10 04:29:06.753','2025-09-10 04:29:06.754'),('cmfdhdg2d0005botpywms6fll','cmewhr798000b9ymqquz57ln7','cmewhr7dn000f9ymq513xxxy4','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-10 04:29:46.261','2025-09-10 04:29:46.261'),('cmflwe23h0001xnlkryr2ykg8','cmewhr798000b9ymqquz57ln7','cmewhr7dn000f9ymq513xxxy4','USER_LOGIN','LOW','User logged in','{}',NULL,'credentials',NULL,NULL,'2025-09-16 01:52:18.458','2025-09-16 01:52:18.459');
/*!40000 ALTER TABLE `activity_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alerts`
--

DROP TABLE IF EXISTS `alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `alerts` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `scheduleId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('LOW_STOCK','EXPIRATION','REORDER','BATCH_READY','MAINTENANCE','SYSTEM') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('LOW','MEDIUM','HIGH','CRITICAL') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MEDIUM',
  `isRead` tinyint(1) NOT NULL DEFAULT '0',
  `isResolved` tinyint(1) NOT NULL DEFAULT '0',
  `resolvedById` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resolvedAt` datetime(3) DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `alerts_tenantId_fkey` (`tenantId`),
  KEY `alerts_scheduleId_fkey` (`scheduleId`),
  KEY `alerts_resolvedById_fkey` (`resolvedById`),
  CONSTRAINT `alerts_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `alerts_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `schedules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `alerts_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alerts`
--

LOCK TABLES `alerts` WRITE;
/*!40000 ALTER TABLE `alerts` DISABLE KEYS */;
INSERT INTO `alerts` VALUES ('cmewpojnj00335b90zmu3q6n4','cmevaj0ss0000gdnahrsnggin',NULL,'LOW_STOCK','Low Stock Alert: Arabica Beans','Arabica coffee beans stock is running low (below minimum threshold)','MEDIUM',0,0,NULL,NULL,'2025-08-29 10:50:16.063','2025-08-29 10:50:16.063'),('cmewpojqt00355b90duibfbjp','cmevaj0ss0000gdnahrsnggin',NULL,'SYSTEM','Quality Check Required','Recent batch quality scores below average - investigation needed','HIGH',0,0,NULL,NULL,'2025-08-29 10:50:16.181','2025-08-29 10:50:16.181'),('cmewpojsz00375b90k1nm8ric','cmevaj0ss0000gdnahrsnggin',NULL,'SYSTEM','Equipment Maintenance Due','Coffee grinder maintenance is overdue','MEDIUM',0,0,NULL,NULL,'2025-08-29 10:50:16.259','2025-08-29 10:50:16.259'),('cmewpojv300395b903hizo8a5','cmevaj0ss0000gdnahrsnggin',NULL,'EXPIRATION','Product Expiry Warning','Some milk products are approaching expiry date','HIGH',0,0,NULL,NULL,'2025-08-29 10:50:16.335','2025-08-29 10:50:16.335');
/*!40000 ALTER TABLE `alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batches`
--

DROP TABLE IF EXISTS `batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `batches` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipeId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batchNumber` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('PLANNED','GREEN_BEANS','ROASTING','COOLING','PACKAGING','READY','COMPLETED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PLANNED',
  `startDate` datetime(3) DEFAULT NULL,
  `endDate` datetime(3) DEFAULT NULL,
  `actualYield` decimal(65,30) DEFAULT NULL,
  `measurements` json DEFAULT NULL,
  `notes` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdById` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batches_tenantId_batchNumber_key` (`tenantId`,`batchNumber`),
  KEY `batches_recipeId_fkey` (`recipeId`),
  KEY `batches_createdById_fkey` (`createdById`),
  CONSTRAINT `batches_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `batches_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `batches_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batches`
--

LOCK TABLES `batches` WRITE;
/*!40000 ALTER TABLE `batches` DISABLE KEYS */;
INSERT INTO `batches` VALUES ('cmew6rq9o0003x61utk2m1557','cmevflj4h000114p722ucja4t','cmevir1hq0012pjz2xuh3oz6l','ROAST-20250829-0900','GREEN_BEANS','2025-08-30 11:47:46.316',NULL,NULL,'{}','fasd\nasdf\nasdf\n','cmevflj8v000514p7hlb974gs','2025-08-29 02:00:51.900','2025-08-30 11:47:47.636'),('cmewpoh16000t5b90nycuvdo5','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20240115-1','COMPLETED','2024-01-15 00:00:00.000','2024-01-15 02:00:00.000',48.000000000000000000000000000000,NULL,'Batch 1 - Good quality espresso production','cmevaj1n20006gdnay4sy44uc','2025-08-29 10:50:12.666','2025-08-29 10:50:12.666'),('cmewpoh4h000v5b90othl234w','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20240115-1','COMPLETED','2024-01-15 03:00:00.000','2024-01-15 05:00:00.000',28.000000000000000000000000000000,NULL,'Batch 1 - Excellent latte production with perfect milk texture','cmevaj1n20006gdnay4sy44uc','2025-08-29 10:50:12.785','2025-08-29 10:50:12.785'),('cmewpoh6q000x5b90zmk6qrcc','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20240120-2','COMPLETED','2024-01-20 00:00:00.000','2024-01-20 02:00:00.000',57.000000000000000000000000000000,NULL,'Batch 2 - Good quality espresso production','cmevaj1n20006gdnay4sy44uc','2025-08-29 10:50:12.866','2025-08-29 10:50:12.866'),('cmewpoh8z000z5b901m9yizve','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20240120-2','COMPLETED','2024-01-20 03:00:00.000','2024-01-20 05:00:00.000',33.000000000000000000000000000000,NULL,'Batch 2 - Excellent latte production with perfect milk texture','cmevaj1n20006gdnay4sy44uc','2025-08-29 10:50:12.947','2025-08-29 10:50:12.947'),('cmewpohb700115b90b9o79qms','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20240125-3','COMPLETED','2024-01-25 00:00:00.000','2024-01-25 02:00:00.000',66.000000000000000000000000000000,NULL,'Batch 3 - Good quality espresso production','cmevaj1n20006gdnay4sy44uc','2025-08-29 10:50:13.027','2025-08-29 10:50:13.027'),('cmewpohdf00135b9025gy3mo1','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20240125-3','COMPLETED','2024-01-25 03:00:00.000','2024-01-25 05:00:00.000',38.000000000000000000000000000000,NULL,'Batch 3 - Excellent latte production with perfect milk texture','cmevaj1n20006gdnay4sy44uc','2025-08-29 10:50:13.108','2025-08-29 10:50:13.108'),('cmewpohfl00155b905h33j40f','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20240201-4','COMPLETED','2024-02-01 00:00:00.000','2024-02-01 02:00:00.000',75.000000000000000000000000000000,NULL,'Batch 4 - Good quality espresso production','cmevaj1n20006gdnay4sy44uc','2025-08-29 10:50:13.186','2025-08-29 10:50:13.186'),('cmewpohhu00175b90ocir0ab3','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20240201-4','COMPLETED','2024-02-01 03:00:00.000','2024-02-01 05:00:00.000',43.000000000000000000000000000000,NULL,'Batch 4 - Excellent latte production with perfect milk texture','cmevaj1n20006gdnay4sy44uc','2025-08-29 10:50:13.266','2025-08-29 10:50:13.266'),('cmewpohk200195b904tetorfh','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20240210-5','COMPLETED','2024-02-10 00:00:00.000','2024-02-10 02:00:00.000',84.000000000000000000000000000000,NULL,'Batch 5 - Good quality espresso production','cmevaj1n20006gdnay4sy44uc','2025-08-29 10:50:13.346','2025-08-29 10:50:13.346'),('cmewpohma001b5b902pj9z4zt','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20240210-5','COMPLETED','2024-02-10 03:00:00.000','2024-02-10 05:00:00.000',48.000000000000000000000000000000,NULL,'Batch 5 - Excellent latte production with perfect milk texture','cmevaj1n20006gdnay4sy44uc','2025-08-29 10:50:13.426','2025-08-29 10:50:13.426'),('cmewpohoj001d5b907qzvweky','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20240215-6','COMPLETED','2024-02-15 00:00:00.000','2024-02-15 02:00:00.000',93.000000000000000000000000000000,NULL,'Batch 6 - Good quality espresso production','cmevaj1n20006gdnay4sy44uc','2025-08-29 10:50:13.507','2025-08-29 10:50:13.507'),('cmewpohqp001f5b90yqp9vuhn','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20240215-6','COMPLETED','2024-02-15 03:00:00.000','2024-02-15 05:00:00.000',53.000000000000000000000000000000,NULL,'Batch 6 - Excellent latte production with perfect milk texture','cmevaj1n20006gdnay4sy44uc','2025-08-29 10:50:13.585','2025-08-29 10:50:13.585'),('cmf2b7gs200019bujicpojdk3','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20250826-1','COMPLETED','2025-08-26 06:51:41.614','2025-08-26 08:51:41.614',57.000000000000000000000000000000,'{\"quality\": \"Excellent\", \"grindSize\": \"Fine\", \"temperature\": \"92°C\", \"extractionTime\": \"25-30 seconds\"}','Daily espresso batch - Tue Aug 26 2025','cmevaj1ip0004gdnaukrriooo','2025-08-26 08:51:41.614','2025-08-26 08:51:41.614'),('cmf2b7gvq00039buj5v34mwcs','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20250826-1','COMPLETED','2025-08-26 07:51:41.614','2025-08-26 08:51:41.614',32.000000000000000000000000000000,'{\"quality\": \"Perfect\", \"milkTexture\": \"Microfoam\", \"temperature\": \"65°C\", \"extractionTime\": \"25 seconds\"}','Daily latte batch - Tue Aug 26 2025','cmevaj1ip0004gdnaukrriooo','2025-08-26 08:51:41.614','2025-08-26 08:51:41.614'),('cmf2b7gyc00059buj37s1fe6w','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20250827-2','COMPLETED','2025-08-27 06:51:41.614','2025-08-27 08:51:41.614',60.000000000000000000000000000000,'{\"quality\": \"Excellent\", \"grindSize\": \"Fine\", \"temperature\": \"92°C\", \"extractionTime\": \"25-30 seconds\"}','Daily espresso batch - Wed Aug 27 2025','cmevaj1ip0004gdnaukrriooo','2025-08-27 08:51:41.614','2025-08-27 08:51:41.614'),('cmf2b7h0r00079bujm8705b8z','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20250827-2','COMPLETED','2025-08-27 07:51:41.614','2025-08-27 08:51:41.614',33.000000000000000000000000000000,'{\"quality\": \"Perfect\", \"milkTexture\": \"Microfoam\", \"temperature\": \"65°C\", \"extractionTime\": \"25 seconds\"}','Daily latte batch - Wed Aug 27 2025','cmevaj1ip0004gdnaukrriooo','2025-08-27 08:51:41.614','2025-08-27 08:51:41.614'),('cmf2b7h3300099buj8261ctbo','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20250828-3','COMPLETED','2025-08-28 06:51:41.614','2025-08-28 08:51:41.614',51.000000000000000000000000000000,'{\"quality\": \"Excellent\", \"grindSize\": \"Fine\", \"temperature\": \"92°C\", \"extractionTime\": \"25-30 seconds\"}','Daily espresso batch - Thu Aug 28 2025','cmevaj1ip0004gdnaukrriooo','2025-08-28 08:51:41.614','2025-08-28 08:51:41.614'),('cmf2b7h5p000b9bujhord36ix','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20250828-3','COMPLETED','2025-08-28 07:51:41.614','2025-08-28 08:51:41.614',44.000000000000000000000000000000,'{\"quality\": \"Perfect\", \"milkTexture\": \"Microfoam\", \"temperature\": \"65°C\", \"extractionTime\": \"25 seconds\"}','Daily latte batch - Thu Aug 28 2025','cmevaj1ip0004gdnaukrriooo','2025-08-28 08:51:41.614','2025-08-28 08:51:41.614'),('cmf2b7h8c000d9bujn5sc83ls','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20250829-4','COMPLETED','2025-08-29 06:51:41.614','2025-08-29 08:51:41.614',57.000000000000000000000000000000,'{\"quality\": \"Excellent\", \"grindSize\": \"Fine\", \"temperature\": \"92°C\", \"extractionTime\": \"25-30 seconds\"}','Daily espresso batch - Fri Aug 29 2025','cmevaj1ip0004gdnaukrriooo','2025-08-29 08:51:41.614','2025-08-29 08:51:41.614'),('cmf2b7hap000f9buj8jqpyebt','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20250829-4','COMPLETED','2025-08-29 07:51:41.614','2025-08-29 08:51:41.614',39.000000000000000000000000000000,'{\"quality\": \"Perfect\", \"milkTexture\": \"Microfoam\", \"temperature\": \"65°C\", \"extractionTime\": \"25 seconds\"}','Daily latte batch - Fri Aug 29 2025','cmevaj1ip0004gdnaukrriooo','2025-08-29 08:51:41.614','2025-08-29 08:51:41.614'),('cmf2b7hd4000h9bujlwkg852s','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20250830-5','COMPLETED','2025-08-30 06:51:41.614','2025-08-30 08:51:41.614',55.000000000000000000000000000000,'{\"quality\": \"Excellent\", \"grindSize\": \"Fine\", \"temperature\": \"92°C\", \"extractionTime\": \"25-30 seconds\"}','Daily espresso batch - Sat Aug 30 2025','cmevaj1ip0004gdnaukrriooo','2025-08-30 08:51:41.614','2025-08-30 08:51:41.614'),('cmf2b7hfi000j9buj4rrkkxun','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20250830-5','COMPLETED','2025-08-30 07:51:41.614','2025-08-30 08:51:41.614',32.000000000000000000000000000000,'{\"quality\": \"Perfect\", \"milkTexture\": \"Microfoam\", \"temperature\": \"65°C\", \"extractionTime\": \"25 seconds\"}','Daily latte batch - Sat Aug 30 2025','cmevaj1ip0004gdnaukrriooo','2025-08-30 08:51:41.614','2025-08-30 08:51:41.614'),('cmf2b7hhx000l9buj83js8arg','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20250831-6','COMPLETED','2025-08-31 06:51:41.614','2025-08-31 08:51:41.614',54.000000000000000000000000000000,'{\"quality\": \"Excellent\", \"grindSize\": \"Fine\", \"temperature\": \"92°C\", \"extractionTime\": \"25-30 seconds\"}','Daily espresso batch - Sun Aug 31 2025','cmevaj1ip0004gdnaukrriooo','2025-08-31 08:51:41.614','2025-08-31 08:51:41.614'),('cmf2b7hk8000n9bujuxjarktp','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20250831-6','COMPLETED','2025-08-31 07:51:41.614','2025-08-31 08:51:41.614',32.000000000000000000000000000000,'{\"quality\": \"Perfect\", \"milkTexture\": \"Microfoam\", \"temperature\": \"65°C\", \"extractionTime\": \"25 seconds\"}','Daily latte batch - Sun Aug 31 2025','cmevaj1ip0004gdnaukrriooo','2025-08-31 08:51:41.614','2025-08-31 08:51:41.614'),('cmf2b7hmn000p9buj95g6zs7h','cmevaj0ss0000gdnahrsnggin','cmewpoglw000j5b90ix8zk9mh','ESP-20250901-7','COMPLETED','2025-09-01 06:51:41.614','2025-09-01 08:51:41.614',65.000000000000000000000000000000,'{\"quality\": \"Excellent\", \"grindSize\": \"Fine\", \"temperature\": \"92°C\", \"extractionTime\": \"25-30 seconds\"}','Daily espresso batch - Mon Sep 01 2025','cmevaj1ip0004gdnaukrriooo','2025-09-01 08:51:41.614','2025-09-01 08:51:41.614'),('cmf2b7hoz000r9bujrs1odgsl','cmevaj0ss0000gdnahrsnggin','cmewpogp7000l5b90lwnz3bas','LAT-20250901-7','COMPLETED','2025-09-01 07:51:41.614','2025-09-01 08:51:41.614',32.000000000000000000000000000000,'{\"quality\": \"Perfect\", \"milkTexture\": \"Microfoam\", \"temperature\": \"65°C\", \"extractionTime\": \"25 seconds\"}','Daily latte batch - Mon Sep 01 2025','cmevaj1ip0004gdnaukrriooo','2025-09-01 08:51:41.614','2025-09-01 08:51:41.614');
/*!40000 ALTER TABLE `batches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contacts`
--

DROP TABLE IF EXISTS `contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `contacts` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `company` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subject` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `inquiryType` enum('GENERAL','SUPPORT','SALES','BILLING','TECHNICAL','PARTNERSHIP') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GENERAL',
  `status` enum('NEW','IN_PROGRESS','RESOLVED','CLOSED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NEW',
  `ipAddress` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `userAgent` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `contacts_status_createdAt_idx` (`status`,`createdAt`),
  KEY `contacts_inquiryType_createdAt_idx` (`inquiryType`,`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contacts`
--

LOCK TABLES `contacts` WRITE;
/*!40000 ALTER TABLE `contacts` DISABLE KEYS */;
/*!40000 ALTER TABLE `contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feature_flag_conditions`
--

DROP TABLE IF EXISTS `feature_flag_conditions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feature_flag_conditions` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `flagId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `operator` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `isEnabled` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `feature_flag_conditions_flagId_fkey` (`flagId`),
  CONSTRAINT `feature_flag_conditions_flagId_fkey` FOREIGN KEY (`flagId`) REFERENCES `feature_flags` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feature_flag_conditions`
--

LOCK TABLES `feature_flag_conditions` WRITE;
/*!40000 ALTER TABLE `feature_flag_conditions` DISABLE KEYS */;
/*!40000 ALTER TABLE `feature_flag_conditions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feature_flags`
--

DROP TABLE IF EXISTS `feature_flags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feature_flags` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isEnabled` tinyint(1) NOT NULL DEFAULT '0',
  `rolloutPercentage` int NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `feature_flags_key_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feature_flags`
--

LOCK TABLES `feature_flags` WRITE;
/*!40000 ALTER TABLE `feature_flags` DISABLE KEYS */;
/*!40000 ALTER TABLE `feature_flags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ingredients`
--

DROP TABLE IF EXISTS `ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `ingredients` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('COFFEE_BEANS','MILK','SUGAR','SYRUP','PASTRY','PACKAGING','OTHER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stockQuantity` decimal(65,30) NOT NULL DEFAULT '0.000000000000000000000000000000',
  `unitOfMeasure` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `minimumThreshold` decimal(65,30) NOT NULL,
  `costPerUnit` decimal(65,30) NOT NULL,
  `location` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `batchNumber` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expirationDate` datetime(3) DEFAULT NULL,
  `supplierId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ingredients_tenantId_fkey` (`tenantId`),
  KEY `ingredients_supplierId_fkey` (`supplierId`),
  CONSTRAINT `ingredients_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `ingredients_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ingredients`
--

LOCK TABLES `ingredients` WRITE;
/*!40000 ALTER TABLE `ingredients` DISABLE KEYS */;
INSERT INTO `ingredients` VALUES ('cmevi4w57000mpjz2oukbh3zq','cmevflj4h000114p722ucja4t','bahan 1','COFFEE_BEANS',11.000000000000000000000000000000,'kg',2.000000000000000000000000000000,16000.000000000000000000000000000000,'gudang 1','ROAST-20250828-2129','2025-09-10 00:00:00.000','cmevhibxc0003pjz2u1sw28g6',1,'2025-08-28 14:31:15.643','2025-08-28 14:31:15.643'),('cmevi7fs9000opjz2kbj0mf9o','cmevflj4h000114p722ucja4t','bahan 2','MILK',90.000000000000000000000000000000,'l',10.000000000000000000000000000000,20000.000000000000000000000000000000,'gudang 1','ROAST-20250828-2129','2025-09-25 00:00:00.000','cmevhibxc0003pjz2u1sw28g6',1,'2025-08-28 14:33:14.408','2025-08-30 11:47:47.849'),('cmevibivo000qpjz2j5pfa5gp','cmevflj4h000114p722ucja4t','bahan 3','SUGAR',50.000000000000000000000000000000,'kg',3.000000000000000000000000000000,3000.000000000000000000000000000000,'gudang 1','','2025-10-28 00:00:00.000','cmevhibxc0003pjz2u1sw28g6',0,'2025-08-28 14:36:25.044','2025-08-29 02:01:25.986'),('cmew9ie1n00019ymqi2i39xr2','cmevflj4h000114p722ucja4t','Gula stevia','SUGAR',10.000000000000000000000000000000,'kg',3.000000000000000000000000000000,15000.000000000000000000000000000000,'gudang 1','',NULL,'cmevhibxc0003pjz2u1sw28g6',1,'2025-08-29 03:17:35.001','2025-08-29 03:17:35.001'),('cmewpog6l00095b90bqpp52as','cmevaj0ss0000gdnahrsnggin','Arabica Coffee Beans','COFFEE_BEANS',500.000000000000000000000000000000,'kg',50.000000000000000000000000000000,12.500000000000000000000000000000,'Main Warehouse',NULL,NULL,'cmewpoftu00015b90134alhuv',1,'2025-08-29 10:50:11.566','2025-08-29 10:50:11.566'),('cmewpog9t000b5b906n8pildj','cmevaj0ss0000gdnahrsnggin','Robusta Coffee Beans','COFFEE_BEANS',300.000000000000000000000000000000,'kg',30.000000000000000000000000000000,8.750000000000000000000000000000,'Main Warehouse',NULL,NULL,'cmewpoftu00015b90134alhuv',1,'2025-08-29 10:50:11.681','2025-08-29 10:50:11.681'),('cmewpogbz000d5b90r63ougmq','cmevaj0ss0000gdnahrsnggin','Whole Milk','MILK',200.000000000000000000000000000000,'liter',20.000000000000000000000000000000,1.200000000000000000000000000000,'Cold Storage',NULL,NULL,NULL,1,'2025-08-29 10:50:11.759','2025-08-29 10:50:11.759');
/*!40000 ALTER TABLE `ingredients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_adjustments`
--

DROP TABLE IF EXISTS `inventory_adjustments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `inventory_adjustments` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ingredientId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('INCREASE','DECREASE','CORRECTION','WASTE','TRANSFER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(65,30) NOT NULL,
  `reason` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdById` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `inventory_adjustments_tenantId_fkey` (`tenantId`),
  KEY `inventory_adjustments_ingredientId_fkey` (`ingredientId`),
  KEY `inventory_adjustments_createdById_fkey` (`createdById`),
  CONSTRAINT `inventory_adjustments_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `inventory_adjustments_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inventory_adjustments_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_adjustments`
--

LOCK TABLES `inventory_adjustments` WRITE;
/*!40000 ALTER TABLE `inventory_adjustments` DISABLE KEYS */;
INSERT INTO `inventory_adjustments` VALUES ('cmewpoi56001r5b90zwisuz3h','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','INCREASE',100.000000000000000000000000000000,'Weekly restock from supplier',NULL,'cmevaj1ip0004gdnaukrriooo','2024-01-10 00:00:00.000'),('cmewpoi8h001t5b90f5znh9o5','cmevaj0ss0000gdnahrsnggin','cmewpogbz000d5b90r63ougmq','INCREASE',50.000000000000000000000000000000,'Fresh milk delivery',NULL,'cmevaj1ip0004gdnaukrriooo','2024-01-10 00:00:00.000'),('cmewpoiap001v5b90gckk6xe8','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','DECREASE',30.000000000000000000000000000000,'Production consumption',NULL,'cmevaj1n20006gdnay4sy44uc','2024-01-10 06:00:00.000'),('cmewpoid0001x5b908frbhnk6','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','INCREASE',120.000000000000000000000000000000,'Weekly restock from supplier',NULL,'cmevaj1ip0004gdnaukrriooo','2024-01-15 00:00:00.000'),('cmewpoif8001z5b906dvj06sl','cmevaj0ss0000gdnahrsnggin','cmewpogbz000d5b90r63ougmq','INCREASE',60.000000000000000000000000000000,'Fresh milk delivery',NULL,'cmevaj1ip0004gdnaukrriooo','2024-01-15 00:00:00.000'),('cmewpoihh00215b90m0xayuz0','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','DECREASE',35.000000000000000000000000000000,'Production consumption',NULL,'cmevaj1n20006gdnay4sy44uc','2024-01-15 06:00:00.000'),('cmewpoijo00235b90wxmnaukb','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','INCREASE',140.000000000000000000000000000000,'Weekly restock from supplier',NULL,'cmevaj1ip0004gdnaukrriooo','2024-01-20 00:00:00.000'),('cmewpoilu00255b90lj6qtm98','cmevaj0ss0000gdnahrsnggin','cmewpogbz000d5b90r63ougmq','INCREASE',70.000000000000000000000000000000,'Fresh milk delivery',NULL,'cmevaj1ip0004gdnaukrriooo','2024-01-20 00:00:00.000'),('cmewpoio100275b90tbw7uqoo','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','DECREASE',40.000000000000000000000000000000,'Production consumption',NULL,'cmevaj1n20006gdnay4sy44uc','2024-01-20 06:00:00.000'),('cmewpoiq900295b908kg8zeyf','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','INCREASE',160.000000000000000000000000000000,'Weekly restock from supplier',NULL,'cmevaj1ip0004gdnaukrriooo','2024-01-25 00:00:00.000'),('cmewpoisg002b5b90ri3s3ht7','cmevaj0ss0000gdnahrsnggin','cmewpogbz000d5b90r63ougmq','INCREASE',80.000000000000000000000000000000,'Fresh milk delivery',NULL,'cmevaj1ip0004gdnaukrriooo','2024-01-25 00:00:00.000'),('cmewpoiuo002d5b90n2lmde48','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','DECREASE',45.000000000000000000000000000000,'Production consumption',NULL,'cmevaj1n20006gdnay4sy44uc','2024-01-25 06:00:00.000'),('cmewpoiww002f5b90h9tv9da4','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','INCREASE',180.000000000000000000000000000000,'Weekly restock from supplier',NULL,'cmevaj1ip0004gdnaukrriooo','2024-02-01 00:00:00.000'),('cmewpoiz4002h5b90pz7a0xtu','cmevaj0ss0000gdnahrsnggin','cmewpogbz000d5b90r63ougmq','INCREASE',90.000000000000000000000000000000,'Fresh milk delivery',NULL,'cmevaj1ip0004gdnaukrriooo','2024-02-01 00:00:00.000'),('cmewpoj1h002j5b90aoc7oame','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','DECREASE',50.000000000000000000000000000000,'Production consumption',NULL,'cmevaj1n20006gdnay4sy44uc','2024-02-01 06:00:00.000'),('cmewpoj3m002l5b90mazs6b39','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','INCREASE',200.000000000000000000000000000000,'Weekly restock from supplier',NULL,'cmevaj1ip0004gdnaukrriooo','2024-02-05 00:00:00.000'),('cmewpoj5t002n5b90c3iwul48','cmevaj0ss0000gdnahrsnggin','cmewpogbz000d5b90r63ougmq','INCREASE',100.000000000000000000000000000000,'Fresh milk delivery',NULL,'cmevaj1ip0004gdnaukrriooo','2024-02-05 00:00:00.000'),('cmewpoj81002p5b90tzv8fhbi','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','DECREASE',55.000000000000000000000000000000,'Production consumption',NULL,'cmevaj1n20006gdnay4sy44uc','2024-02-05 06:00:00.000'),('cmewpoja9002r5b90y51a9awz','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','INCREASE',220.000000000000000000000000000000,'Weekly restock from supplier',NULL,'cmevaj1ip0004gdnaukrriooo','2024-02-10 00:00:00.000'),('cmewpojcg002t5b901r113vuq','cmevaj0ss0000gdnahrsnggin','cmewpogbz000d5b90r63ougmq','INCREASE',110.000000000000000000000000000000,'Fresh milk delivery',NULL,'cmevaj1ip0004gdnaukrriooo','2024-02-10 00:00:00.000'),('cmewpojen002v5b90zfkxuyiq','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','DECREASE',60.000000000000000000000000000000,'Production consumption',NULL,'cmevaj1n20006gdnay4sy44uc','2024-02-10 06:00:00.000'),('cmewpojgw002x5b906k9iiknj','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','INCREASE',240.000000000000000000000000000000,'Weekly restock from supplier',NULL,'cmevaj1ip0004gdnaukrriooo','2024-02-15 00:00:00.000'),('cmewpojj3002z5b90rxixhjem','cmevaj0ss0000gdnahrsnggin','cmewpogbz000d5b90r63ougmq','INCREASE',120.000000000000000000000000000000,'Fresh milk delivery',NULL,'cmevaj1ip0004gdnaukrriooo','2024-02-15 00:00:00.000'),('cmewpojla00315b907mbmpdpm','cmevaj0ss0000gdnahrsnggin','cmewpog6l00095b90bqpp52as','DECREASE',65.000000000000000000000000000000,'Production consumption',NULL,'cmevaj1n20006gdnay4sy44uc','2024-02-15 06:00:00.000'),('cmey76dts0004kp8l0jhul1qc','cmevflj4h000114p722ucja4t','cmevi7fs9000opjz2kbj0mf9o','DECREASE',10.000000000000000000000000000000,'Roast batch started: ROAST-20250829-0900',NULL,'cmevflj8v000514p7hlb974gs','2025-08-30 11:47:47.969');
/*!40000 ALTER TABLE `inventory_adjustments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `packaging_types`
--

DROP TABLE IF EXISTS `packaging_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `packaging_types` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `packaging_types_tenantId_name_key` (`tenantId`,`name`),
  CONSTRAINT `packaging_types_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `packaging_types`
--

LOCK TABLES `packaging_types` WRITE;
/*!40000 ALTER TABLE `packaging_types` DISABLE KEYS */;
INSERT INTO `packaging_types` VALUES ('cmevhj1xz0005pjz250ha8oo3','cmevflj4h000114p722ucja4t','Cup small','300 ml',1,'2025-08-28 14:14:16.727','2025-08-28 14:14:16.727'),('cmevhjjdj0007pjz23wkkle7e','cmevflj4h000114p722ucja4t','Bag','paper',1,'2025-08-28 14:14:39.319','2025-08-28 14:14:39.319'),('cmewpoger000f5b909vsfh805','cmevaj0ss0000gdnahrsnggin','Coffee Bag 250g','Resealable coffee bag for 250g of coffee',1,'2025-08-29 10:50:11.859','2025-08-29 10:50:11.859'),('cmewpogj4000h5b90t29hd8fp','cmevaj0ss0000gdnahrsnggin','Paper Cup 12oz','Disposable paper cup for hot beverages',1,'2025-08-29 10:50:12.016','2025-08-29 10:50:12.016'),('cmf549uc10003nfpqr75tcq5h','cmewhr798000b9ymqquz57ln7','Cup small',NULL,1,'2025-09-04 08:00:53.711','2025-09-04 08:00:53.711'),('cmfdhdvv90007botpyx7vha80','cmewhr798000b9ymqquz57ln7','Cup medium',NULL,1,'2025-09-10 04:30:06.742','2025-09-10 04:30:06.742');
/*!40000 ALTER TABLE `packaging_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permissions` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_key` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES ('cmevaj23i000kgdnafnqg4we8','users.create','Create new users','users','create','2025-08-28 10:58:19.614'),('cmevaj25o000lgdnanmk05czj','recipes.update','Update recipes','recipes','update','2025-08-28 10:58:19.614'),('cmevaj25q000mgdnard7t7l62','batches.update','Update batch information','batches','update','2025-08-28 10:58:19.615'),('cmevaj25w000ngdnaugkbh1p4','users.update','Update user information','users','update','2025-08-28 10:58:19.614'),('cmevaj25x000ogdnaos32nyrv','products.create','Create new products','products','create','2025-08-28 10:58:19.615'),('cmevaj25x000pgdnaon7n0uhl','batches.create','Create new batches','batches','create','2025-08-28 10:58:19.615'),('cmevaj260000qgdnarxw96ri2','products.update','Update product information','products','update','2025-08-28 10:58:19.615'),('cmevaj260000rgdnab9qbkmc9','products.delete','Delete products','products','delete','2025-08-28 10:58:19.615'),('cmevaj263000sgdnafk407vvi','ingredients.update','Update ingredient information','ingredients','update','2025-08-28 10:58:19.614'),('cmevaj263000tgdnart9bjh9f','recipes.create','Create new recipes','recipes','create','2025-08-28 10:58:19.614'),('cmevaj267000ugdnak0cv078f','users.delete','Delete users','users','delete','2025-08-28 10:58:19.614'),('cmevaj267000vgdnasyy5petj','reports.read','View reports and analytics','reports','read','2025-08-28 10:58:19.615'),('cmevaj267000wgdnacndsb3ci','recipes.delete','Delete recipes','recipes','delete','2025-08-28 10:58:19.614'),('cmevaj269000xgdnawgsg7qsd','batches.delete','Delete batches','batches','delete','2025-08-28 10:58:19.615'),('cmevaj26f000ygdnajavsm3hj','reports.export','Export reports','reports','export','2025-08-28 10:58:19.615'),('cmevaj26f000zgdna00w858nb','products.read','View products','products','read','2025-08-28 10:58:19.615'),('cmevaj26f0010gdna57dzkoo8','users.read','View users','users','read','2025-08-28 10:58:19.614'),('cmevaj26l0011gdnaq3i61p75','ingredients.delete','Delete ingredients','ingredients','delete','2025-08-28 10:58:19.615'),('cmevaj28n0012gdna90wa8w2o','settings.read','View settings','settings','read','2025-08-28 10:58:19.615'),('cmevaj28t0013gdnaba6hc28w','settings.update','Update settings','settings','update','2025-08-28 10:58:19.615'),('cmevaj28v0014gdnamh5fp4nc','recipes.read','View recipes','recipes','read','2025-08-28 10:58:19.615'),('cmevaj2960015gdna5r0w0cxd','ingredients.create','Add new ingredients','ingredients','create','2025-08-28 10:58:19.615'),('cmevaj2960016gdnamwdcx5tv','ingredients.read','View ingredients','ingredients','read','2025-08-28 10:58:19.615'),('cmevaj2970017gdnaiyf1iwfs','batches.read','View batches','batches','read','2025-08-28 10:58:19.615');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `products` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batchId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `packagingTypeId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `packagingDate` datetime(3) DEFAULT NULL,
  `lotNumber` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` decimal(65,30) NOT NULL DEFAULT '0.000000000000000000000000000000',
  `shelfLife` int DEFAULT NULL,
  `storageLocation` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('IN_STOCK','LOW_STOCK','OUT_OF_STOCK','EXPIRED','RECALLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'IN_STOCK',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `products_tenantId_fkey` (`tenantId`),
  KEY `products_batchId_fkey` (`batchId`),
  KEY `products_packagingTypeId_fkey` (`packagingTypeId`),
  CONSTRAINT `products_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `batches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `products_packagingTypeId_fkey` FOREIGN KEY (`packagingTypeId`) REFERENCES `packaging_types` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `products_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES ('cmevfexyj0061jvxuo7sg03aw','cmevaj0ss0000gdnahrsnggin',NULL,'Americano Latte',NULL,'2025-08-28 00:00:00.000','LOT-20250828-2013',50.000000000000000000000000000000,NULL,'Cold storage','IN_STOCK','2025-08-28 13:15:05.706','2025-08-28 13:15:05.706'),('cmewa2n0j00039ymq5dta22xb','cmevflj4h000114p722ucja4t','cmew6rq9o0003x61utk2m1557','Americano','cmevhj1xz0005pjz250ha8oo3','2025-08-21 00:00:00.000','LOT-20250829-1032',14.000000000000000000000000000000,100,'gudang 1','LOW_STOCK','2025-08-29 03:33:19.747','2025-08-29 03:33:19.747'),('cmewaly1y00059ymqhfuyh24a','cmevflj4h000114p722ucja4t',NULL,'Capuccino','cmevhjjdj0007pjz23wkkle7e','2025-08-29 00:00:00.000','LOT-20250829-1048',10.000000000000000000000000000000,NULL,NULL,'IN_STOCK','2025-08-29 03:48:20.517','2025-08-29 03:48:20.517'),('cmewamq3y00079ymqo2w1p03y','cmevflj4h000114p722ucja4t',NULL,'Flat white','cmevhj1xz0005pjz250ha8oo3','2025-08-29 00:00:00.000','LOT-20250829-1048',7.940000000000000000000000000000,100,'gudang 1','IN_STOCK','2025-08-29 03:48:56.878','2025-08-29 03:48:56.878'),('cmewanx0v00099ymql92uuf7g','cmevflj4h000114p722ucja4t','cmew6rq9o0003x61utk2m1557','coffee latte','cmevhj1xz0005pjz250ha8oo3','2025-09-03 00:00:00.000','LOT-20250829-1049',4.000000000000000000000000000000,30,'gudang 1','IN_STOCK','2025-08-29 03:49:52.494','2025-08-29 03:49:52.494'),('cmf54alax0005nfpq4ddx8d5g','cmewhr798000b9ymqquz57ln7',NULL,'Product One','cmf549uc10003nfpqr75tcq5h','2025-09-03 00:00:00.000','LOT-20250904-1501',10.000000000000000000000000000000,30,'gudang 1','IN_STOCK','2025-09-04 08:01:28.665','2025-09-04 08:01:28.665'),('cmf54bdth0007nfpqhv6nvmuk','cmewhr798000b9ymqquz57ln7',NULL,'Product Delete','cmf549uc10003nfpqr75tcq5h','2025-09-04 00:00:00.000','LOT-20250904-1501',5.000000000000000000000000000000,NULL,NULL,'IN_STOCK','2025-09-04 08:02:05.621','2025-09-04 08:02:05.621'),('cmfdhezku0009botp345wea3t','cmewhr798000b9ymqquz57ln7',NULL,'Product 2','cmfdhdvv90007botpyx7vha80','2025-09-10 00:00:00.000','LOT-20250910-1130',23.000000000000000000000000000000,100,'gudang 1','IN_STOCK','2025-09-10 04:30:58.206','2025-09-10 04:30:58.206');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recipe_ingredients`
--

DROP TABLE IF EXISTS `recipe_ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `recipe_ingredients` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipeId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ingredientId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(65,30) NOT NULL,
  `unit` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `recipe_ingredients_recipeId_ingredientId_key` (`recipeId`,`ingredientId`),
  KEY `recipe_ingredients_ingredientId_fkey` (`ingredientId`),
  CONSTRAINT `recipe_ingredients_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `recipe_ingredients_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `recipes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recipe_ingredients`
--

LOCK TABLES `recipe_ingredients` WRITE;
/*!40000 ALTER TABLE `recipe_ingredients` DISABLE KEYS */;
INSERT INTO `recipe_ingredients` VALUES ('cmevir1jy0013pjz2o56h5035','cmevir1hq0012pjz2xuh3oz6l','cmevi7fs9000opjz2kbj0mf9o',10.000000000000000000000000000000,'L',''),('cmewpogrc000n5b90blpdbtff','cmewpoglw000j5b90ix8zk9mh','cmewpog6l00095b90bqpp52as',18.000000000000000000000000000000,'g',NULL),('cmeyberbo000akp8l26p9fy8k','cmewpogp7000l5b90lwnz3bas','cmewpog6l00095b90bqpp52as',18.000000000000000000000000000000,'g',''),('cmeyberbo000bkp8l163g387m','cmewpogp7000l5b90lwnz3bas','cmewpogbz000d5b90r63ougmq',250.000000000000000000000000000000,'ml','');
/*!40000 ALTER TABLE `recipe_ingredients` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `recipes`
--

DROP TABLE IF EXISTS `recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `recipes` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `style` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `expectedYield` decimal(65,30) NOT NULL,
  `processInstructions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `version` int NOT NULL DEFAULT '1',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `recipes_tenantId_fkey` (`tenantId`),
  CONSTRAINT `recipes_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `recipes`
--

LOCK TABLES `recipes` WRITE;
/*!40000 ALTER TABLE `recipes` DISABLE KEYS */;
INSERT INTO `recipes` VALUES ('cmevi2npt000ipjz2kt4v8dz1','cmevflj4h000114p722ucja4t','House matcha','Dark','fasd\nerq\nqwre\nqwer',10.000000000000000000000000000000,'asdf\nasdf\nasdf\nasdf',1,1,'2025-08-28 14:29:31.409','2025-08-28 14:29:31.409'),('cmevir1hq0012pjz2xuh3oz6l','cmevflj4h000114p722ucja4t','bahan 2','Dark','Lorem ipsum dolor sit amet, consectetur adipiscing elit. In ornare gravida blandit. Fusce a urna dictum, molestie felis a, maximus est. Aliquam id ante sit amet odio porta pellentesque consectetur a felis. ',14.000000000000000000000000000000,'adsf\nfd\nasdf\nas\ndf\nasdf',1,1,'2025-08-28 14:48:29.006','2025-08-28 14:48:29.006'),('cmewpoglw000j5b90ix8zk9mh','cmevaj0ss0000gdnahrsnggin','Classic Espresso',NULL,'Traditional espresso blend',30.000000000000000000000000000000,'Grind beans to fine consistency. Extract for 25-30 seconds.',1,1,'2025-08-29 10:50:12.116','2025-08-29 10:50:12.116'),('cmewpogp7000l5b90lwnz3bas','cmevaj0ss0000gdnahrsnggin','Caffe Latte','','Espresso with steamed milk',355.000000000000000000000000000000,'Prepare espresso shot. Steam milk to 65°C. Combine with latte art. Add 10 ml oat milk.',2,1,'2025-08-29 10:50:12.235','2025-08-30 13:46:17.014'),('cmf54cij4000anfpq69qzj39l','cmewhr798000b9ymqquz57ln7','Roast Main','Medium','af afds\nadsf\n',30.000000000000000000000000000000,'',1,1,'2025-09-04 08:02:58.384','2025-09-04 08:02:58.384');
/*!40000 ALTER TABLE `recipes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `role_permissions` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `roleId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permissionId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role_permissions_roleId_permissionId_key` (`roleId`,`permissionId`),
  KEY `role_permissions_permissionId_fkey` (`permissionId`),
  CONSTRAINT `role_permissions_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `role_permissions_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isSystem` tinyint(1) NOT NULL DEFAULT '0',
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_tenantId_key` (`name`,`tenantId`),
  KEY `roles_tenantId_fkey` (`tenantId`),
  CONSTRAINT `roles_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('cmevfljb5000714p76bupjess','Admin','Full access to all brewery operations',1,'cmevflj4h000114p722ucja4t','2025-08-28 13:20:13.313','2025-08-28 13:20:13.313'),('cmevfljb5000914p7pptaoxtd','Manager','Manage operations and view reports',1,'cmevflj4h000114p722ucja4t','2025-08-28 13:20:13.313','2025-08-28 13:20:13.313'),('cmevfljb5000b14p7a4nusid3','Brewmaster','Manage recipes and production batches',1,'cmevflj4h000114p722ucja4t','2025-08-28 13:20:13.313','2025-08-28 13:20:13.313'),('cmevfljb5000d14p7z7ygtcsi','Warehouse Staff','Manage inventory and shipments',1,'cmevflj4h000114p722ucja4t','2025-08-28 13:20:13.313','2025-08-28 13:20:13.313'),('cmevfljb5000f14p76jh93qd4','Sales','View products and manage orders',1,'cmevflj4h000114p722ucja4t','2025-08-28 13:20:13.313','2025-08-28 13:20:13.313'),('cmewhr7ga000h9ymqjzrfl9pp','Admin','Full access to all brewery operations',1,'cmewhr798000b9ymqquz57ln7','2025-08-29 07:08:23.287','2025-08-29 07:08:23.287'),('cmewhr7ga000j9ymqmqwqi3l6','Manager','Manage operations and view reports',1,'cmewhr798000b9ymqquz57ln7','2025-08-29 07:08:23.287','2025-08-29 07:08:23.287'),('cmewhr7gb000l9ymq2ritfepu','Brewmaster','Manage recipes and production batches',1,'cmewhr798000b9ymqquz57ln7','2025-08-29 07:08:23.287','2025-08-29 07:08:23.287'),('cmewhr7gb000n9ymqelffke8e','Warehouse Staff','Manage inventory and shipments',1,'cmewhr798000b9ymqquz57ln7','2025-08-29 07:08:23.287','2025-08-29 07:08:23.287'),('cmewhr7gc000p9ymq00q1gr8r','Sales','View products and manage orders',1,'cmewhr798000b9ymqquz57ln7','2025-08-29 07:08:23.287','2025-08-29 07:08:23.287');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schedules`
--

DROP TABLE IF EXISTS `schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schedules` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` enum('BREW_SESSION','MAINTENANCE','CLEANING','DELIVERY','MEETING','OTHER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `startDate` datetime(3) NOT NULL,
  `endDate` datetime(3) DEFAULT NULL,
  `isRecurring` tinyint(1) NOT NULL DEFAULT '0',
  `recurrenceRule` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED','POSTPONED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SCHEDULED',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `schedules_tenantId_fkey` (`tenantId`),
  CONSTRAINT `schedules_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schedules`
--

LOCK TABLES `schedules` WRITE;
/*!40000 ALTER TABLE `schedules` DISABLE KEYS */;
INSERT INTO `schedules` VALUES ('cmewpohsy001h5b90laspjxxe','cmevaj0ss0000gdnahrsnggin','Morning Espresso Production','Daily espresso batch production for morning rush','BREW_SESSION','2024-02-20 06:00:00.000','2024-02-20 08:00:00.000',0,NULL,'SCHEDULED','2025-08-29 10:50:13.666','2025-08-29 10:50:13.666'),('cmewpohwc001j5b9046sn3gpd','cmevaj0ss0000gdnahrsnggin','Latte Preparation','Prepare latte batches for lunch service','BREW_SESSION','2024-02-20 10:00:00.000','2024-02-20 12:00:00.000',0,NULL,'SCHEDULED','2025-08-29 10:50:13.788','2025-08-29 10:50:13.788'),('cmewpohyj001l5b90fvyqsedu','cmevaj0ss0000gdnahrsnggin','Equipment Maintenance','Weekly cleaning and maintenance of coffee machines','MAINTENANCE','2024-02-21 14:00:00.000','2024-02-21 16:00:00.000',0,NULL,'SCHEDULED','2025-08-29 10:50:13.867','2025-08-29 10:50:13.867'),('cmewpoi0q001n5b90tm7dy3p9','cmevaj0ss0000gdnahrsnggin','Inventory Check','Weekly inventory audit and stock replenishment','OTHER','2024-02-22 09:00:00.000','2024-02-22 11:00:00.000',0,NULL,'SCHEDULED','2025-08-29 10:50:13.946','2025-08-29 10:50:13.946'),('cmewpoi2y001p5b90g0rc9hiq','cmevaj0ss0000gdnahrsnggin','Quality Control Testing','Taste testing and quality assessment of new batches','OTHER','2024-02-23 15:00:00.000','2024-02-23 16:30:00.000',0,NULL,'SCHEDULED','2025-08-29 10:50:14.027','2025-08-29 10:50:14.027');
/*!40000 ALTER TABLE `schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `sessions` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sessionToken` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sessions_sessionToken_key` (`sessionToken`),
  KEY `sessions_userId_fkey` (`userId`),
  CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipment_items`
--

DROP TABLE IF EXISTS `shipment_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shipment_items` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `shipmentId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ingredientId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantityOrdered` decimal(65,30) NOT NULL,
  `quantityReceived` decimal(65,30) NOT NULL,
  `unitCost` decimal(65,30) DEFAULT NULL,
  `batchNumber` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `expirationDate` datetime(3) DEFAULT NULL,
  `notes` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `shipment_items_shipmentId_fkey` (`shipmentId`),
  KEY `shipment_items_ingredientId_fkey` (`ingredientId`),
  CONSTRAINT `shipment_items_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `ingredients` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `shipment_items_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `shipments` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipment_items`
--

LOCK TABLES `shipment_items` WRITE;
/*!40000 ALTER TABLE `shipment_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipment_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipments`
--

DROP TABLE IF EXISTS `shipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `shipments` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplierId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipmentNumber` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receivedDate` datetime(3) NOT NULL,
  `status` enum('PENDING','RECEIVED','PARTIAL','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `notes` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `receivedById` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `shipments_tenantId_fkey` (`tenantId`),
  KEY `shipments_supplierId_fkey` (`supplierId`),
  KEY `shipments_receivedById_fkey` (`receivedById`),
  CONSTRAINT `shipments_receivedById_fkey` FOREIGN KEY (`receivedById`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `shipments_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `shipments_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipments`
--

LOCK TABLES `shipments` WRITE;
/*!40000 ALTER TABLE `shipments` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `storage_locations`
--

DROP TABLE IF EXISTS `storage_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `storage_locations` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `storage_locations_tenantId_name_key` (`tenantId`,`name`),
  CONSTRAINT `storage_locations_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `storage_locations`
--

LOCK TABLES `storage_locations` WRITE;
/*!40000 ALTER TABLE `storage_locations` DISABLE KEYS */;
INSERT INTO `storage_locations` VALUES ('cmevhkk2y0009pjz2i3nxh6m0','cmevflj4h000114p722ucja4t','gudang 1','as asdf asdf',100,1,'2025-08-28 14:15:26.891','2025-08-28 14:15:26.891'),('cmewhz2fs001h9ymqy0w2m4p7','cmewhr798000b9ymqquz57ln7','gudang 1',NULL,100,1,'2025-08-29 07:14:30.040','2025-08-29 07:14:30.040'),('cmewhza2y001j9ymqt2l4fgbt','cmewhr798000b9ymqquz57ln7','gudang 2',NULL,150,1,'2025-08-29 07:14:39.946','2025-08-29 07:14:39.946'),('cmewhzwa7001l9ymqf6m28pmo','cmewhr798000b9ymqquz57ln7','Gudang 3',NULL,200,1,'2025-08-29 07:15:08.719','2025-08-29 07:15:08.719'),('cmewi10p8001n9ymqv72y7ovv','cmewhr798000b9ymqquz57ln7','gudang 4',NULL,NULL,1,'2025-08-29 07:16:01.100','2025-08-29 07:16:01.100'),('cmewi3hnz001p9ymq0q2s55zi','cmewhr798000b9ymqquz57ln7','gudang 5','dasf',400,1,'2025-08-29 07:17:56.399','2025-08-29 07:17:56.399'),('cmewpofzk00055b90daqxcq0k','cmevaj0ss0000gdnahrsnggin','Main Warehouse','Primary storage facility',10000,1,'2025-08-29 10:50:11.312','2025-08-29 10:50:11.312'),('cmewpog3w00075b903ykq29ij','cmevaj0ss0000gdnahrsnggin','Cold Storage','Temperature-controlled storage',5000,1,'2025-08-29 10:50:11.469','2025-08-29 10:50:11.469');
/*!40000 ALTER TABLE `storage_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscription_plans` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(65,30) NOT NULL,
  `interval` enum('MONTHLY','YEARLY') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `maxUsers` int DEFAULT NULL,
  `maxIngredients` int DEFAULT NULL,
  `maxBatches` int DEFAULT NULL,
  `features` json NOT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `maxStorageLocations` int DEFAULT NULL,
  `maxProducts` int DEFAULT NULL,
  `maxRecipes` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_plans`
--

LOCK TABLES `subscription_plans` WRITE;
/*!40000 ALTER TABLE `subscription_plans` DISABLE KEYS */;
INSERT INTO `subscription_plans` VALUES ('enterprise-plan','Enterprise','For large breweries with unlimited needs',500000.000000000000000000000000000000,'MONTHLY',NULL,NULL,NULL,'[]',0,'2025-08-28 10:58:17.839','2025-08-28 14:08:04.300',NULL,NULL,NULL),('free-plan','Free','Try our platform with 1 month free access',0.000000000000000000000000000000,'MONTHLY',1,3,1,'{\"batches\": true, \"recipes\": true, \"inventory\": true, \"basicReports\": false, \"emailSupport\": false}',1,'2025-08-28 10:58:17.484','2025-08-30 14:18:14.174',1,4,2),('professional-plan','Professional','For growing breweries with advanced needs',250000.000000000000000000000000000000,'MONTHLY',20,100,100,'[\"Advanced report and analytics\", \"QR Code scanning\", \"Advanced inventory management\", \"Recipe versioning & scaling\"]',1,'2025-08-28 10:58:17.745','2025-08-29 07:37:58.200',20,100,100),('starter-plan','Starter','Perfect for small craft breweries',150000.000000000000000000000000000000,'MONTHLY',10,50,50,'[\"Simple recipe management\", \"Basic report\", \"Schedule & Calendar\"]',1,'2025-08-28 10:58:17.642','2025-08-29 07:37:42.898',10,50,50);
/*!40000 ALTER TABLE `subscription_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subscriptions` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `planId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `stripeCustomerId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripeSubscriptionId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('ACTIVE','PAST_DUE','CANCELLED','INCOMPLETE','INCOMPLETE_EXPIRED','TRIALING','UNPAID') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `currentPeriodStart` datetime(3) NOT NULL,
  `currentPeriodEnd` datetime(3) NOT NULL,
  `cancelAtPeriodEnd` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subscriptions_tenantId_key` (`tenantId`),
  KEY `subscriptions_planId_fkey` (`planId`),
  CONSTRAINT `subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `subscription_plans` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `subscriptions_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
INSERT INTO `subscriptions` VALUES ('cmevaj0xe0002gdnaquq57358','cmevaj0ss0000gdnahrsnggin','professional-plan',NULL,NULL,'ACTIVE','2025-08-28 10:58:18.084','2025-09-27 10:58:18.084',0,'2025-08-28 10:58:18.099','2025-08-28 10:58:18.099'),('cmevflj6p000314p7xvc08470','cmevflj4h000114p722ucja4t','starter-plan',NULL,NULL,'ACTIVE','2025-08-28 13:20:13.152','2025-09-03 08:03:39.145',0,'2025-08-28 13:20:13.153','2025-09-02 08:16:49.607'),('cmewhr7bh000d9ymqo0w3tp38','cmewhr798000b9ymqquz57ln7','starter-plan',NULL,NULL,'TRIALING','2025-08-29 07:08:23.116','2025-09-28 07:08:23.116',0,'2025-08-29 07:08:23.117','2025-08-29 07:08:23.117');
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `suppliers` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `contactPerson` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `suppliers_tenantId_fkey` (`tenantId`),
  CONSTRAINT `suppliers_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES ('cmevhibxc0003pjz2u1sw28g6','cmevflj4h000114p722ucja4t','CV Paragonia','Panji','sales@paragonia.com','08114324545','Permata depok\nsektor pirus k14/4\nKel. pondok jaya, kec. cipayung','penyedia telur, kopi, susu, minyak goreng',1,'2025-08-28 14:13:42.915','2025-08-28 14:13:42.915'),('cmewpoftu00015b90134alhuv','cmevaj0ss0000gdnahrsnggin','Premium Coffee Beans Co.','John Smith','john@premiumcoffee.com','+1-555-0123','123 Coffee Street, Seattle, WA 98101','High-quality arabica beans supplier',1,'2025-08-29 10:50:11.106','2025-08-29 10:50:11.106'),('cmewpofx800035b906wzz7uwh','cmevaj0ss0000gdnahrsnggin','EcoPack Solutions','Sarah Johnson','sarah@ecopack.com','+1-555-0789','789 Green Way, Portland, OR 97201','Sustainable packaging materials supplier',1,'2025-08-29 10:50:11.228','2025-08-29 10:50:11.228');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_settings`
--

DROP TABLE IF EXISTS `tenant_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenant_settings` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenant_settings_tenantId_key_key` (`tenantId`,`key`),
  CONSTRAINT `tenant_settings_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_settings`
--

LOCK TABLES `tenant_settings` WRITE;
/*!40000 ALTER TABLE `tenant_settings` DISABLE KEYS */;
INSERT INTO `tenant_settings` VALUES ('cmevfljkp000j14p7k7f91t19','cmevflj4h000114p722ucja4t','timezone','UTC','2025-08-28 13:20:13.657','2025-08-28 13:20:13.657'),('cmevfljkp000l14p7616o9yzm','cmevflj4h000114p722ucja4t','currency','IDR','2025-08-28 13:20:13.657','2025-08-28 13:20:13.657'),('cmevfljkp000n14p758qn2ml2','cmevflj4h000114p722ucja4t','date_format','MM/DD/YYYY','2025-08-28 13:20:13.657','2025-08-28 13:20:13.657'),('cmevfljkp000p14p788yitnjh','cmevflj4h000114p722ucja4t','low_stock_threshold','10','2025-08-28 13:20:13.657','2025-08-28 13:20:13.657'),('cmevfljkp000r14p7pi4tn04t','cmevflj4h000114p722ucja4t','enable_notifications','true','2025-08-28 13:20:13.657','2025-08-28 13:20:13.657'),('cmewhr7p9000t9ymquszmgxc4','cmewhr798000b9ymqquz57ln7','timezone','UTC','2025-08-29 07:08:23.613','2025-08-29 07:08:23.613'),('cmewhr7p9000v9ymq54xz68da','cmewhr798000b9ymqquz57ln7','currency','IDR','2025-08-29 07:08:23.613','2025-08-29 07:08:23.613'),('cmewhr7p9000x9ymqavo7h647','cmewhr798000b9ymqquz57ln7','date_format','MM/DD/YYYY','2025-08-29 07:08:23.613','2025-08-29 07:08:23.613'),('cmewhr7p9000z9ymq4x6czjpz','cmewhr798000b9ymqquz57ln7','low_stock_threshold','10','2025-08-29 07:08:23.613','2025-08-29 07:08:23.613'),('cmewhr7pa00119ymqsec8nzs0','cmewhr798000b9ymqquz57ln7','enable_notifications','true','2025-08-29 07:08:23.613','2025-08-29 07:08:23.613');
/*!40000 ALTER TABLE `tenant_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tenants` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `subdomain` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `domain` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('ACTIVE','SUSPENDED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tenants_subdomain_key` (`subdomain`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
INSERT INTO `tenants` VALUES ('cmevaj0ss0000gdnahrsnggin','Demo Coffee Shop','demo',NULL,'ACTIVE','2025-08-28 10:58:17.932','2025-08-28 10:58:17.932'),('cmevflj4h000114p722ucja4t','Kopi Free','kopi-free',NULL,'ACTIVE','2025-08-28 13:20:13.073','2025-08-28 13:20:13.073'),('cmewhr798000b9ymqquz57ln7','Kopi Star','kopi-star',NULL,'ACTIVE','2025-08-29 07:08:23.036','2025-08-29 07:08:23.036');
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usage`
--

DROP TABLE IF EXISTS `usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usage` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `metric` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` int NOT NULL,
  `date` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `usage_tenantId_metric_date_key` (`tenantId`,`metric`,`date`),
  CONSTRAINT `usage_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usage`
--

LOCK TABLES `usage` WRITE;
/*!40000 ALTER TABLE `usage` DISABLE KEYS */;
INSERT INTO `usage` VALUES ('cmf16e0yh0002w4lyd01tfmtw','cmevflj4h000114p722ucja4t','users',1,'2025-08-31 17:00:00.000'),('cmf16e0yh0003w4ly23ho504i','cmevflj4h000114p722ucja4t','ingredients',3,'2025-08-31 17:00:00.000'),('cmf16e0yh0004w4lypu3ro0p9','cmevflj4h000114p722ucja4t','batches',1,'2025-08-31 17:00:00.000'),('cmf1xxc2s0000pnw9k9ufiqyl','cmevflj4h000114p722ucja4t','users',1,'2025-09-01 17:00:00.000'),('cmf1xxc2s0001pnw9adcbbuvp','cmevflj4h000114p722ucja4t','ingredients',3,'2025-09-01 17:00:00.000'),('cmf1xxc2s0002pnw927vqthwc','cmevflj4h000114p722ucja4t','batches',1,'2025-09-01 17:00:00.000');
/*!40000 ALTER TABLE `usage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_role_assignments`
--

DROP TABLE IF EXISTS `user_role_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_role_assignments` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `userId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `roleId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assignedAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `assignedBy` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_role_assignments_userId_roleId_key` (`userId`,`roleId`),
  KEY `user_role_assignments_roleId_fkey` (`roleId`),
  CONSTRAINT `user_role_assignments_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `user_role_assignments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_role_assignments`
--

LOCK TABLES `user_role_assignments` WRITE;
/*!40000 ALTER TABLE `user_role_assignments` DISABLE KEYS */;
INSERT INTO `user_role_assignments` VALUES ('cmevflji1000h14p7qjhlkt87','cmevflj8v000514p7hlb974gs','cmevfljb5000714p76bupjess','2025-08-28 13:20:13.562',NULL),('cmewhr7n0000r9ymqtrpcdbs4','cmewhr7dn000f9ymq513xxxy4','cmewhr7ga000h9ymqjzrfl9pp','2025-08-29 07:08:23.533',NULL);
/*!40000 ALTER TABLE `user_role_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenantId` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('PLATFORM_ADMIN','SUPPORT','BILLING_ADMIN','ADMIN','MANAGER','BREWMASTER','WAREHOUSE_STAFF','SALES','STAFF') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'STAFF',
  `isActive` tinyint(1) NOT NULL DEFAULT '1',
  `lastLogin` datetime(3) DEFAULT NULL,
  `emailVerified` datetime(3) DEFAULT NULL,
  `image` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_tenantId_email_key` (`tenantId`,`email`),
  CONSTRAINT `users_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('cmevaj1ip0004gdnaukrriooo','cmevaj0ss0000gdnahrsnggin','admin@demo.coffeeshop','Demo Admin','$2a$12$WPfQtO1mZRlW0AJohvRDOeq8xNp/G2.9UyxXRRy8MpXzenzMUokUO','ADMIN',1,'2025-09-04 08:03:51.718',NULL,NULL,'2025-08-28 10:58:18.865','2025-09-04 08:03:51.720'),('cmevaj1n20006gdnay4sy44uc','cmevaj0ss0000gdnahrsnggin','barista@demo.coffeeshop','Demo Barista','$2a$12$WPfQtO1mZRlW0AJohvRDOeq8xNp/G2.9UyxXRRy8MpXzenzMUokUO','BREWMASTER',1,NULL,NULL,NULL,'2025-08-28 10:58:19.023','2025-08-28 10:58:19.023'),('cmevaj1pr0008gdna8ind9917','cmevaj0ss0000gdnahrsnggin','platform@coffeeshop.com','Platform Admin','$2a$12$WPfQtO1mZRlW0AJohvRDOeq8xNp/G2.9UyxXRRy8MpXzenzMUokUO','PLATFORM_ADMIN',1,'2025-09-10 04:29:06.635',NULL,NULL,'2025-08-28 10:58:19.119','2025-09-10 04:29:06.636'),('cmevflj8v000514p7hlb974gs','cmevflj4h000114p722ucja4t','admin@kopifree.com','John Free Doe','$2a$12$TQA4xSZdshJS9cgQbQ72F.X6TVFQKDjNRXUHZRifNR6MYaB87UPYa','ADMIN',1,'2025-09-04 07:59:22.213','2025-08-28 13:20:13.230',NULL,'2025-08-28 13:20:13.231','2025-09-04 07:59:22.214'),('cmewhr7dn000f9ymq513xxxy4','cmewhr798000b9ymqquz57ln7','admin@kopistar.id','Astra Star','$2a$12$o9LhbXX8V.LxiEFBrDItseKHORvRQVjjLtUlSOL2mvYgU3kWWBTDe','ADMIN',1,'2025-09-16 01:52:18.140','2025-08-29 07:08:23.195',NULL,'2025-08-29 07:08:23.196','2025-09-16 01:52:18.141'),('cmewht6ly00169ymqv45ssoal','cmewhr798000b9ymqquz57ln7','user1@kopistar.id','User1','$2a$12$1OVOF7FWiJWk9oR7Ul/0jeJ0Eq2BzhU4T1eGRxCdn63deYD/lKqH2','STAFF',1,NULL,'2025-08-29 07:09:55.509',NULL,'2025-08-29 07:09:55.510','2025-08-29 07:09:55.510'),('cmewhtnpw00199ymq3bmo591i','cmewhr798000b9ymqquz57ln7','user2@kopistar.id','User 2','$2a$12$rWfcBGPerWKG1mnYRHytTO7GoUGigRvw1vLaeV0at/o.p051gFWyG','WAREHOUSE_STAFF',1,NULL,'2025-08-29 07:10:17.684',NULL,'2025-08-29 07:10:17.685','2025-08-29 07:10:17.685'),('cmewhxhj9001c9ymq71twm4tp','cmewhr798000b9ymqquz57ln7','user3@kopistar.id','User3','$2a$12$UBIRqwMmbnk1vj0iS1g/Lu.kPQ6iHWENgY1GaQtvcCOobt74apANK','BREWMASTER',1,NULL,'2025-08-29 07:13:16.292',NULL,'2025-08-29 07:13:16.293','2025-08-29 07:13:16.293'),('cmewhxybz001f9ymq3p7ditdv','cmewhr798000b9ymqquz57ln7','user5@kopistar.id','User5','$2a$12$.FADh9pvINY8Ac0O2zQQlOCWCPhRZfi3eeyMOuYJrH1TGkDYtU30W','MANAGER',1,NULL,'2025-08-29 07:13:38.062',NULL,'2025-08-29 07:13:38.063','2025-08-29 07:13:38.063');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `verification_tokens`
--

DROP TABLE IF EXISTS `verification_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `verification_tokens` (
  `id` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `identifier` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `verification_tokens_token_key` (`token`),
  UNIQUE KEY `verification_tokens_identifier_token_key` (`identifier`,`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `verification_tokens`
--

LOCK TABLES `verification_tokens` WRITE;
/*!40000 ALTER TABLE `verification_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `verification_tokens` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-16  9:54:20
