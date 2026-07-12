-- Buyer consult + listing presentation are IN-PERSON training with Noah — the
-- portal tracks the sessions, it does not replace them. Any videos for these
-- are short optional intros, not the training itself. Safe to run anytime
-- (plain updates, no reseed).
update tasks set
  title = 'Buyer consultation training — in person with Noah',
  description = 'Live session including the buyer brokerage agreement. Trained in person, not by video — the portal just tracks that it happened.'
where key = 'buyer_consult_training';

update tasks set
  title = 'Listing presentation training — in person with Noah',
  description = 'Week 3, live: the 14-slide listing system, CMA slides, net sheet, intake questionnaire. In-person training; an optional short intro video may be linked here as prep.'
where key = 'listing_training';
