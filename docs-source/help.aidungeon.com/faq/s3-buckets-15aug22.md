---
title: "Unauthorized Access of S3 Buckets on August 15, 2022"
source: https://help.aidungeon.com/faq/s3-buckets-15aug22
scraped: 2026-11-25
---

# Unauthorized Access of S3 Buckets on August 15, 2022

We were alerted on August 15, 2022, that someone had changed images on our landing page, [aidungeon.com](https://aidungeon.com/), by accessing specific S3 buckets. Although several players messaged us on Discord earlier, notifications first reached our team at 9:50 pm MDT. We immediately notified the community on [Discord](https://discord.com/channels/903327676884979802/909925903579107368/1008953312009265182) and [Reddit](https://www.reddit.com/r/AIDungeon/comments/wpl9c6/an_update_on_unauthorized_access_to_s3_buckets/) that data was accessed. Within 30 minutes, we fixed the vulnerability and rotated all system credentials.

Upon further investigation, we identified the individuals who accessed the S3 buckets. They gained access using a key obtained from an unsecured workflow endpoint that we configured. Our provider partner helped us secure that workflow endpoint and has added measures to ensure setting up unsecured workflow endpoints is no longer possible.

As we reviewed, we realized the individuals also accessed a backup file containing old model request data. This data consists of the inputs fed into models, their corresponding outputs, and the anonymous user ID. Although no passwords, usernames, or emails were contained in this data, model request data is still sensitive because it includes text from stories our players create.

Our CEO, Nick Walton, participated in a [Discord discussion](https://discord.com/channels/903327676884979802/909932831684321321/1009191379756400701) and answered community questions. The primary concern players had was that model request data was being stored at all, regardless of what it was used for.

As a result, we are making several changes to our product and data. First, all backup logs of model request data have been removed from our systems. Second, we have discontinued storing model request data unless users explicitly opt into sending us this data for improving the AI or reporting issues with the system. Third, we will consider providing an option of end-to-end encryption secured with a client-side key for those willing to trade a little convenience (like resetting their password without losing access to their stories) for another layer of encryption.

After closing the vulnerability and disclosing the unauthorized access to our community, we reached out directly to each individual involved. They were all cooperative, apologetic, and quickly confirmed they deleted the data. Our log files line up with their self-reported access. All evidence suggests only a small portion of model request data was accessed, specifically a 54-minute segment of data for Davinci model requests from 5:37 pm - 6:31 pm UTC, December 13, 2021. While we did contact law enforcement and Discord to help with the investigation, since player ID’s remained anonymous and story data wasn’t shared, we will not pursue other legal action.

Even though the data was not shared, we will be emailing all players whose data (input, output, and anonymous user ID) was potentially accessed.

We feel fortunate that those individuals accessed only a small data set, but it is unacceptable that any data was accessed at all. We’ve been investing heavily in product stability and security to rebuild player trust, and we clearly have more work to do.

If you have any questions or concerns, please contact us at [support@aidungeon.com](mailto:support@aidungeon.com).
