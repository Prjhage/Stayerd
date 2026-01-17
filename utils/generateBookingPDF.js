const PDFDocument = require("pdfkit");

module.exports.generateBookingPDF = ({
  res,
  bookingId,
  user,
  owner,
  listing,
  booking,
}) => {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=booking-${bookingId}.pdf`
  );
  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  /* ===== SAFE VALUES ===== */
  let nights = 0;
  let pricePerNight = 0;
  let gst = 0;
  let totalPrice = 0;

  let adults = 1;
  let children = 0;
  let infants = 0;
  let animals = 0;

  /* ===== BASIC BOOKING DETAILS ===== */
  if (booking && booking.nights) {
    nights = Number(booking.nights);
  }

  if (listing && listing.price) {
    pricePerNight = Number(listing.price);
  }

  if (booking && booking.gst) {
    gst = Number(booking.gst);
  }

  if (booking && booking.totalPrice) {
    totalPrice = Number(booking.totalPrice);
  }

  /* ===== GUEST DETAILS ===== */
  if (booking && booking.guests) {
    if (booking.guests.adults !== undefined) {
      adults = Number(booking.guests.adults);
    }

    if (booking.guests.children !== undefined) {
      children = Number(booking.guests.children);
    }

    if (booking.guests.infants !== undefined) {
      infants = Number(booking.guests.infants);
    }

    if (booking.guests.animals !== undefined) {
      animals = Number(booking.guests.animals);
    }
  }

  const payingGuests = adults + children;
  let freeGuests = 3;
  if (listing && listing.freeGuests !== undefined) {
    freeGuests = listing.freeGuests;
  }
  const extraGuests = Math.max(0, payingGuests - freeGuests);

  const BASE_AMOUNT = nights * pricePerNight;
  let extraGuestCharge = 500;
  if (listing && listing.extraGuestChargePerNight !== undefined) {
    extraGuestCharge = listing.extraGuestChargePerNight;
  }
  const EXTRA_GUEST_FEE = extraGuests * extraGuestCharge * nights;

  let petCharge = 300;
  if (listing && listing.petChargePerNight !== undefined) {
    petCharge = listing.petChargePerNight;
  }
  const PET_FEE = animals * petCharge * nights;

  /* ===== BORDER ===== */
  doc.rect(20, 20, 555, 800).lineWidth(1).stroke("#1e4fa1");

  /* ===== WATERMARK ===== */
  const startY = doc.y;
  doc.save();
  doc.translate(297.5, 421).rotate(-45);
  doc.fontSize(80).fillColor("#cccccc").opacity(0.2);
  doc.text(booking.status.toUpperCase(), -297.5, -30, {
    align: "center",
    width: 595,
  });
  doc.restore();
  doc.y = startY;

  /* ===== HEADER ===== */
  doc
    .fontSize(26)
    .fillColor("#1e4fa1")
    .text("Booking Invoice", { align: "center" });

  doc.moveDown(0.3);

  doc
    .fontSize(10)
    .fillColor("#555")
    .text(
      `${listing?.location || "Wanderlust"}, ${listing?.country || ""} | ${
        owner?.email || "info@wanderlust.com"
      }`,
      { align: "center" }
    );

  doc.moveDown();
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke("#cfd8e3");

  /* ===== BOOKING INFO ===== */
  let y = doc.y + 20;
  doc.fontSize(11).fillColor("#000");

  doc.text("Booking Details", 40, y, { underline: true });
  y += 18;

  doc.text(`Listing: ${listing?.title || "N/A"}`, 40, y);
  y += 15;

  doc.text(`Guest Name: ${user?.username || "N/A"}`, 40, y);
  y += 15;

  doc.text(`Check-in: ${booking.startDate.toDateString()}`, 40, y);
  y += 15;

  doc.text(`Check-out: ${booking.endDate.toDateString()}`, 40, y);
  y += 15;

  doc.text(`Nights: ${nights}`, 40, y);

  doc.text(`Booking ID: ${bookingId}`, 350, y - 45);
  doc.text(
    `Status: ${
      booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
    }`,
    350,
    y - 30
  );

  /* ===== GUEST SUMMARY ===== */
  y += 30;
  doc.text("Guest Summary", 40, y, { underline: true });
  y += 18;

  doc.text(`Adults: ${adults}`, 40, y);
  doc.text(`Children: ${children}`, 180, y);
  y += 15;

  doc.text(`Infants: ${infants}`, 40, y);
  doc.text(`Pets: ${animals}`, 180, y);

  /* ===== PRICE TABLE ===== */
  let tableTop = y + 40;

  doc.rect(40, tableTop, 515, 22).fill("#1e4fa1");

  doc
    .fillColor("#fff")
    .fontSize(11)
    .text("Description", 50, tableTop + 6, { width: 340 })
    .text("Amount", 400, tableTop + 6, { width: 140, align: "right" });

  doc.fillColor("#000");

  let rowY = tableTop + 30;

  doc.text(`${nights} Nights x Rs. ${pricePerNight}`, 50, rowY);
  doc.text(`Rs. ${BASE_AMOUNT.toLocaleString("en-IN")}`, 400, rowY, {
    width: 140,
    align: "right",
  });

  rowY += 22;

  if (extraGuests > 0) {
    doc.text(
      `Extra Guests (${extraGuests}) x Rs. ${listing?.extraGuestChargePerNight || 500} x ${nights} nights`,
      50,
      rowY
    );
    doc.text(`Rs. ${EXTRA_GUEST_FEE.toLocaleString("en-IN")}`, 400, rowY, {
      width: 140,
      align: "right",
    });
    rowY += 22;
  }

  if (animals > 0) {
    doc.text(
      `Pet Fee (${animals}) x Rs. ${listing?.petChargePerNight || 300} x ${nights} nights`,
      50,
      rowY
    );
    doc.text(`Rs. ${PET_FEE.toLocaleString("en-IN")}`, 400, rowY, {
      width: 140,
      align: "right",
    });
    rowY += 22;
  }
  doc.text("GST (18%)", 50, rowY);
  doc.text(`Rs. ${gst.toLocaleString("en-IN")}`, 400, rowY, {
    width: 140,
    align: "right",
  });

  rowY += 25;
  doc
    .moveTo(40, rowY - 5)
    .lineTo(555, rowY - 5)
    .lineWidth(0.5)
    .stroke("#ccc");

  doc.fontSize(13).fillColor("#1e4fa1").text("TOTAL", 300, rowY);
  doc.text(`Rs. ${totalPrice.toLocaleString("en-IN")}`, 400, rowY, {
    width: 140,
    align: "right",
  });

  /* ===== NOTE ===== */
  rowY += 35;
  doc
    .fontSize(9)
    .fillColor("#444")
    .text(
      `ℹ Includes up to ${freeGuests} guests at no extra cost. Additional guests and pets incur additional nightly charges.`,
      40,
      rowY,
      { width: 500 }
    );

  doc.end();
};
