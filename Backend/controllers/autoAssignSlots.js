const Paper = require('../models/paper');
const { generateRoomName } = require('../utils/excelImporter');
const { sendSlotConfirmationEmail } = require('./paperController');
const { createNotificationHelper } = require('./notificationController');

const PAPERS_PER_SESSION = 6;
const PAPERS_PER_ROOM = 12;
const CONFERENCE_DAYS = 3;
const ALLOWED_DATES = [
  '2026-01-09',
  '2026-01-10',
  '2026-01-11'
];

const autoAssignSlots = async (req, res) => {
  try {
    const unassignedPapers = await Paper.find({ isSlotAllocated: false }).sort({ domain: 1 });

    if (unassignedPapers.length === 0) {
      return res.status(200).json({ success: true, message: 'No unassigned papers found.' });
    }

    for (const paper of unassignedPapers) {
      let slotAssigned = false;

      for (const date of ALLOWED_DATES) {
        const totalPapersInDomain = await Paper.countDocuments({ domain: paper.domain });
        const roomsNeeded = Math.ceil((totalPapersInDomain / CONFERENCE_DAYS) / PAPERS_PER_ROOM);

        const rooms = Array.from({ length: roomsNeeded }, (_, i) => generateRoomName(paper.domain, i + 1));

        for (const room of rooms) {
          for (const session of ['Session 1', 'Session 2']) {
            const count = await Paper.countDocuments({
              'selectedSlot.date': new Date(date),
              'selectedSlot.room': room,
              'selectedSlot.session': session
            });

            if (count < PAPERS_PER_SESSION) {
              paper.selectedSlot = {
                date: new Date(date),
                room,
                session,
                bookedBy: 'Auto System'
              };
              paper.isSlotAllocated = true;
              await paper.save();

              await sendSlotConfirmationEmail(paper);

              for (const presenter of paper.presenters) {
                await createNotificationHelper({
                  title: 'Slot Auto-Assigned',
                  message: `Slot Auto-Assigned for "${paper.title}" - Room ${room}, ${session} on ${date}`,
                  type: 'info',
                  recipient: presenter.email,
                  relatedTo: paper._id
                });
              }

              slotAssigned = true;
              break;
            }
          }
          if (slotAssigned) break;
        }
        if (slotAssigned) break;
      }
    }

    res.status(200).json({ success: true, message: 'Auto slot assignment completed successfully.' });

  } catch (error) {
    console.error('Auto Slot Assignment Error:', error);
    res.status(500).json({ success: false, message: 'Auto Slot Assignment Failed', error: error.message });
  }
};

module.exports = { autoAssignSlots };
