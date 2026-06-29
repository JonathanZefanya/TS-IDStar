-- Allow lunch breaks to be stored as either a duration (01:00)
-- or a time range (12:00 - 13:00).
ALTER TABLE `timesheet_entries` MODIFY `lunch_break` VARCHAR(13) NOT NULL;
