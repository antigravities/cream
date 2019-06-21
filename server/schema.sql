SET NAMES utf8;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';

SET NAMES utf8mb4;

DROP TABLE IF EXISTS `apps`;
CREATE TABLE `apps` (
  `appid` bigint(20) unsigned NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
  `oprice` decimal(10,2) DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `discount` tinyint(4) DEFAULT NULL,
  `oprice_eur` decimal(10,2) DEFAULT NULL,
  `price_eur` decimal(10,2) DEFAULT NULL,
  `discount_eur` tinyint(4) DEFAULT NULL,
  `windows` bit(1) NOT NULL,
  `macos` bit(1) NOT NULL,
  `linux` bit(1) NOT NULL,
  `htcvive` bit(1) NOT NULL,
  `oculusrift` bit(1) NOT NULL,
  `windowsmr` bit(1) NOT NULL,
  `reviews` varchar(255) NOT NULL,
  `releasedate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `submitter` int(11) DEFAULT NULL,
  `verifier` int(11) DEFAULT NULL,
  `developer` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  `publisher` varchar(255) CHARACTER SET utf8mb4 DEFAULT NULL,
  `tags` text,
  KEY `submitter` (`submitter`),
  CONSTRAINT `apps_ibfk_1` FOREIGN KEY (`submitter`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `apps_ibfk_2` FOREIGN KEY (`submitter`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `apps_unverified`;
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


DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `steamid` varchar(17) NOT NULL,
  `apikey` varchar(255) NOT NULL,
  `pick_override` bit(1) NOT NULL DEFAULT b'0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


DROP TABLE IF EXISTS `user_pick`;
CREATE TABLE `user_pick` (
  `userid` int(11) NOT NULL,
  `appid` bigint(20) unsigned NOT NULL,
  PRIMARY KEY (`userid`,`appid`),
  CONSTRAINT `userid` FOREIGN KEY (`userid`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


-- 2019-06-21 03:28:55