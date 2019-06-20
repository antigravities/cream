-- MySQL dump 10.13  Distrib 5.7.24, for Linux (x86_64)
--
-- Host: localhost    Database: cream
-- ------------------------------------------------------
-- Server version       5.7.24-0ubuntu0.16.04.1

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

--
-- Table structure for table `apps`
--

DROP TABLE IF EXISTS `apps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `apps` (
  `appid` bigint(20) unsigned NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
  `oprice` decimal(10,2) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `discount` tinyint(4) NOT NULL,
  `windows` bit(1) NOT NULL,
  `macos` bit(1) NOT NULL,
  `linux` bit(1) NOT NULL,
  `htcvive` bit(1) NOT NULL,
  `oculusrift` bit(1) NOT NULL,
  `windowsmr` bit(1) NOT NULL,
  `reviews` varchar(255) NOT NULL,
  `releasedate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `submitter` int(11) NOT NULL,
  `verifier` int(11) NOT NULL,
  `developer` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  `publisher` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  `tags` text,
  KEY `submitter` (`submitter`),
  CONSTRAINT `apps_ibfk_1` FOREIGN KEY (`submitter`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `apps_ibfk_2` FOREIGN KEY (`submitter`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `apps_unverified`
--

DROP TABLE IF EXISTS `apps_unverified`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `apps_unverified` (
  `appid` bigint(20) unsigned NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `oprice` decimal(10,2) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `discount` tinyint(4) NOT NULL,
  `windows` bit(1) NOT NULL,
  `macos` bit(1) NOT NULL,
  `linux` bit(1) NOT NULL,
  `htcvive` bit(1) NOT NULL,
  `oculusrift` bit(1) NOT NULL,
  `windowsmr` bit(1) NOT NULL,
  `reviews` varchar(255) NOT NULL,
  `releasedate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `submitter` int(11) NOT NULL,
  KEY `submitter` (`submitter`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_pick`
--

DROP TABLE IF EXISTS `user_pick`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_pick` (
  `userid` int(11) NOT NULL,
  `appid` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`userid`,`appid`),
  CONSTRAINT `userid` FOREIGN KEY (`userid`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `steamid` varchar(17) NOT NULL,
  `apikey` varchar(255) NOT NULL,
  `pick_override` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2018-12-19 20:20:38