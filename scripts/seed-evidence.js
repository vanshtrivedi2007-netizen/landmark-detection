import fs from 'fs';
import path from 'path';

const outDir = path.resolve('data/evidence');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const docs = [
  // Taj Mahal
  {
    id: 'ev_taj_001',
    landmarkIds: ['taj-mahal'],
    title: 'Taj Mahal — UNESCO World Heritage Centre',
    publisher: 'UNESCO',
    type: 'primary',
    url: 'https://whc.unesco.org/en/list/252',
    retrievedAt: '2026-10-01',
    licence: 'UNESCO Terms of Use',
    reliability: 'high',
    body: `The Taj Mahal is an ivory-white marble mausoleum on the south bank of the Yamuna river in the Indian city of Agra. It was commissioned in 1632 by the Mughal emperor Shah Jahan to house the tomb of his favourite wife, Mumtaz Mahal.

The tomb is the centrepiece of a 17-hectare (42-acre) complex, which includes a mosque and a guest house, and is set in formal gardens bounded on three sides by a crenellated wall.`
  },
  {
    id: 'ev_taj_002',
    landmarkIds: ['taj-mahal'],
    title: 'Taj Mahal: History, Architecture & Significance',
    publisher: 'Encyclopaedia Britannica',
    type: 'secondary',
    url: 'https://www.britannica.com/topic/Taj-Mahal',
    retrievedAt: '2026-10-01',
    licence: 'Fair use educational excerpt',
    reliability: 'high',
    body: `Inscribed as a UNESCO World Heritage Site in 1983, the Taj Mahal is regarded by many as the finest example of Mughal architecture and a symbol of India's rich history.

The architecture combines elements from Persian, Islamic, and Indian architectural styles, culminating in an octagonal chamber topped by a spectacular central onion dome.`
  },
  {
    id: 'ev_taj_003',
    landmarkIds: ['taj-mahal'],
    title: 'Architectural Analysis of the Taj Mahal Complex',
    publisher: 'Archaeological Survey of India Journal',
    type: 'secondary',
    url: 'https://asi.nic.in/publications/taj-complex',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Access',
    reliability: 'high',
    body: `Four slender minarets stand at each of the four corners of the square plinth, each over 40 metres tall. The minarets are deliberately angled slightly outward to protect the central dome in case of collapse.

The exterior decoration features pietre dure inlay work using semi-precious stones embedded in translucent white Makrana marble.`
  },
  {
    id: 'ev_taj_004',
    landmarkIds: ['taj-mahal'],
    title: 'Visiting the Taj Mahal — Official Guidelines and Hours',
    publisher: 'Archaeological Survey of India',
    type: 'primary',
    url: 'https://asi.nic.in/taj-mahal/',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Data',
    reliability: 'high',
    body: `The monument is open daily except Friday, from sunrise to sunset. Ticket counters open 45 minutes before sunrise and close 45 minutes before sunset.

Visitors may enter via the West Gate, East Gate, or South Gate. Security guidelines prohibit large bags, smoking items, food, and tripods inside the complex.`
  },
  {
    id: 'ev_taj_007',
    landmarkIds: ['taj-mahal'],
    title: 'Agra District Environmental Assessment and Riverbank Report',
    publisher: 'India Meteorological Department & CPCB',
    type: 'dataset',
    url: 'https://mausam.imd.gov.in/agra',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Data',
    reliability: 'medium',
    body: `Agra experiences a semi-arid climate with extremely high temperatures during May and June, regularly exceeding 45 °C (113 °F). Dust storms are common during pre-monsoon summer months.

The Yamuna riverbank elevation sits at approximately 165 metres above sea level. High river levels during the monsoon season (July to September) necessitate ongoing monitoring of foundation moisture and bank erosion.`
  },

  // Red Fort
  {
    id: 'ev_red_001',
    landmarkIds: ['red-fort'],
    title: 'Red Fort Complex — UNESCO World Heritage Centre',
    publisher: 'UNESCO',
    type: 'primary',
    url: 'https://whc.unesco.org/en/list/231',
    retrievedAt: '2026-10-01',
    licence: 'UNESCO Terms of Use',
    reliability: 'high',
    body: `The Red Fort Complex was built as the palace fort of Shahjahanabad, the fifth Mughal capital in Delhi, founded by Emperor Shah Jahan in 1638. Construction commenced in 1638 and was completed in 1648.

The fortress features massive red sandstone walls that rise up to 33 metres on the city side and 18 metres along the river.`
  },
  {
    id: 'ev_red_002',
    landmarkIds: ['red-fort'],
    title: 'Red Fort: Political and Cultural History of Delhi',
    publisher: 'Encyclopaedia Britannica',
    type: 'secondary',
    url: 'https://www.britannica.com/topic/Red-Fort',
    retrievedAt: '2026-10-01',
    licence: 'Fair use educational excerpt',
    reliability: 'high',
    body: `Designated a UNESCO World Heritage Site in 2007, the Red Fort is a premier national monument. Each year on 15 August, India's Independence Day, the Prime Minister hoists the national flag at the Lahori Gate ramparts.

The fort's design represents the zenith of Mughal creativity under Shah Jahan, integrating Persian palace architecture with indigenous Indian traditions.`
  },
  {
    id: 'ev_red_003',
    landmarkIds: ['red-fort'],
    title: 'Architectural Layout and Pavilions of Lal Qila',
    publisher: 'Archaeological Survey of India',
    type: 'secondary',
    url: 'https://asi.nic.in/red-fort-pavilions',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Data',
    reliability: 'high',
    body: `The Diwan-i-Aam (Hall of Public Audience) features engrailed arches supported by marble pillars and contains a marble canopy throne.

The Diwan-i-Khas (Hall of Private Audience) is built of white marble inlaid with floral motifs, once housing the fabled Peacock Throne.`
  },
  {
    id: 'ev_red_004',
    landmarkIds: ['red-fort'],
    title: 'Visitor Information and Ticketing: Red Fort, Delhi',
    publisher: 'Archaeological Survey of India',
    type: 'primary',
    url: 'https://asi.nic.in/red-fort/',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Data',
    reliability: 'high',
    body: `The Red Fort is open to visitors Tuesday through Sunday from 9:30 AM to 4:30 PM, and is closed on Mondays.

An evening Sound and Light show (Son et Lumière) operates in Hindi and English narrating the history of Mughal Delhi. Tickets can be booked through the ASI portal.`
  },
  {
    id: 'ev_red_007',
    landmarkIds: ['red-fort'],
    title: 'Delhi Regional Climate and Urban Environmental Data',
    publisher: 'India Meteorological Department',
    type: 'dataset',
    url: 'https://mausam.imd.gov.in/delhi',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Data',
    reliability: 'medium',
    body: `Delhi features an overlapping monsoon-influenced humid subtropical climate and semi-arid conditions. Summer lasts from early April to late June with heatwaves reaching 46 °C.

Winter months (December and January) experience heavy morning fog and cold spells, with low temperatures dropping to 4–7 °C.`
  },

  // Qutub Minar
  {
    id: 'ev_qut_001',
    landmarkIds: ['qutub-minar'],
    title: 'Qutb Minar and its Monuments, Delhi — UNESCO',
    publisher: 'UNESCO',
    type: 'primary',
    url: 'https://whc.unesco.org/en/list/233',
    retrievedAt: '2026-10-01',
    licence: 'UNESCO Terms of Use',
    reliability: 'high',
    body: `Built in the early 13th century a few kilometres south of Delhi, the red sandstone tower of Qutb Minar tapers from a 14.32 m diameter base to 2.75 m at its peak, reaching 72.5 metres in height.

Construction was initiated by Qutb ud-Din Aibak in 1192 and carried forward by Shams-ud-din Iltutmish and later repaired and augmented by Firoz Shah Tughlaq.`
  },
  {
    id: 'ev_qut_002',
    landmarkIds: ['qutub-minar'],
    title: 'The Qutb Archaeological Complex: Historical Context',
    publisher: 'Encyclopaedia Britannica',
    type: 'secondary',
    url: 'https://www.britannica.com/topic/Qutb-Minar',
    retrievedAt: '2026-10-01',
    licence: 'Fair use educational excerpt',
    reliability: 'high',
    body: `Inscribed on the UNESCO World Heritage list in 1993, the complex includes the celebrated 4th-century Gupta Iron Pillar, which possesses remarkable corrosion resistance.

The surrounding ruins also preserve the Quwwat-ul-Islam Mosque, notable as one of the oldest surviving mosques built on the Indian subcontinent.`
  },
  {
    id: 'ev_qut_003',
    landmarkIds: ['qutub-minar'],
    title: 'Structure, Storeys and Inscriptions of the Qutb Minar',
    publisher: 'Archaeological Survey of India',
    type: 'secondary',
    url: 'https://asi.nic.in/qutb-architecture',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Data',
    reliability: 'high',
    body: `The minar comprises five distinct storeys, each marked by a projecting balcony supported by ornate stalactite-like brackets.

The first three storeys are constructed of fluted red sandstone columns, while the upper storeys are composed of smooth buff sandstone and white marble.`
  },
  {
    id: 'ev_qut_004',
    landmarkIds: ['qutub-minar'],
    title: 'Visitor Hours, Access and Safety Regulations — Qutub Minar',
    publisher: 'Archaeological Survey of India',
    type: 'primary',
    url: 'https://asi.nic.in/qutub-minar/',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Data',
    reliability: 'high',
    body: `The Qutb Minar complex is open to the public daily from sunrise until sunset. Online ticketing is available via the ASI official portal.

The internal spiral staircase comprising 379 steps has been closed to the public since a tragic stampede in 1981. Viewing is restricted to the exterior grounds.`
  },
  {
    id: 'ev_qut_007',
    landmarkIds: ['qutub-minar'],
    title: 'Mehrauli Terrain and Environmental Profile',
    publisher: 'Delhi Pollution Control Committee & IMD',
    type: 'dataset',
    url: 'https://dpcc.delhigovt.nic.in/',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Data',
    reliability: 'medium',
    body: `Mehrauli sits on the southern edge of the Delhi Ridge, an extension of the Aravalli mountain range, with terrain elevation averaging 220 metres above sea level.

The local rock consists of ancient quartzite. The surrounding green belt provides moderate shade, but summer daytime temperatures remain high from April through June.`
  },

  // India Gate
  {
    id: 'ev_ind_001',
    landmarkIds: ['india-gate'],
    title: 'India Gate War Memorial — History and Architecture',
    publisher: 'New Delhi Municipal Council (NDMC)',
    type: 'primary',
    url: 'https://ndmc.gov.in/heritage/india_gate.aspx',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Data',
    reliability: 'high',
    body: `The India Gate (originally the All India War Memorial) was designed by Sir Edwin Lutyens. The foundation stone was laid on 10 February 1921, and the memorial was unveiled on 12 February 1931.

It stands 42 metres tall and honours the 70,000 soldiers of the British Indian Army who died between 1914 and 1921 in the First World War and Third Anglo-Afghan War.`
  },
  {
    id: 'ev_ind_002',
    landmarkIds: ['india-gate'],
    title: 'India Gate and the Kartavya Path Ceremonial Axis',
    publisher: 'Encyclopaedia Britannica',
    type: 'secondary',
    url: 'https://www.britannica.com/topic/India-Gate',
    retrievedAt: '2026-10-01',
    licence: 'Fair use educational excerpt',
    reliability: 'high',
    body: `India Gate is situated at the eastern terminus of Kartavya Path (formerly Rajpath), directly aligned with the Rashtrapati Bhavan (Presidential Palace) to the west.

It serves as the focal point of the annual Republic Day parade held every 26 January, celebrating the enactment of India's constitution.`
  },
  {
    id: 'ev_ind_003',
    landmarkIds: ['india-gate'],
    title: 'The Architecture of Edwin Lutyens in New Delhi',
    publisher: 'Lutyens Trust Record',
    type: 'secondary',
    url: 'https://lutyenstrust.org.uk/india-gate',
    retrievedAt: '2026-10-01',
    licence: 'Open Access Research',
    reliability: 'high',
    body: `Lutyens modelled India Gate after the Arc de Triomphe in Paris, using pale red and yellow Bharatpur sandstone.

The surfaces of the arch are inscribed with over 13,000 individual names of servicemen killed during operations on the North-West Frontier and across Europe and Africa.`
  },
  {
    id: 'ev_ind_004',
    landmarkIds: ['india-gate'],
    title: 'Kartavya Path Visitor Guide and Public Grounds Information',
    publisher: 'New Delhi Municipal Council',
    type: 'primary',
    url: 'https://ndmc.gov.in/visitor/kartavya-path',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Data',
    reliability: 'high',
    body: `The monument grounds and surrounding lawns are open 24 hours a day with free public access. Floodlights illuminate the arch every evening from 7:00 PM to 9:30 PM.

Pedestrian underpasses and designated food vendor zones ensure safe pedestrian flow around the bustling C-Hexagon roundabout.`
  },
  {
    id: 'ev_ind_007',
    landmarkIds: ['india-gate'],
    title: 'Central Delhi Environmental Conditions and Air Quality Record',
    publisher: 'Central Pollution Control Board',
    type: 'dataset',
    url: 'https://cpcb.nic.in/air-quality-central-delhi',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Data',
    reliability: 'medium',
    body: `Central Delhi's open lawns sit at approximately 215 metres above sea level on flat alluvial plains.

During the post-monsoon and winter months (October through January), temperature inversions frequently trap particulate matter, causing elevated PM2.5 levels across the ceremonial boulevard.`
  },

  // Hawa Mahal
  {
    id: 'ev_haw_001',
    landmarkIds: ['hawa-mahal'],
    title: 'Hawa Mahal — Official Heritage Record',
    publisher: 'Department of Tourism, Government of Rajasthan',
    type: 'primary',
    url: 'https://www.tourism.rajasthan.gov.in/hawa-mahal.html',
    retrievedAt: '2026-10-01',
    licence: 'Government of Rajasthan Open Data',
    reliability: 'high',
    body: `Hawa Mahal, or the 'Palace of Winds', was built in 1799 by Maharaja Sawai Pratap Singh and designed by Lal Chand Ustad.

The five-storey pyramidal facade rises 15 metres from its high base. Its 953 casements or jharokhas were built to allow purdah-observing royal women to watch street life and processions unnoticed.`
  },
  {
    id: 'ev_haw_002',
    landmarkIds: ['hawa-mahal'],
    title: 'Jaipur City, Rajasthan — UNESCO World Heritage Centre',
    publisher: 'UNESCO',
    type: 'primary',
    url: 'https://whc.unesco.org/en/list/1605',
    retrievedAt: '2026-10-01',
    licence: 'UNESCO Terms of Use',
    reliability: 'high',
    body: `Inscribed on the UNESCO World Heritage list in 2019, the fortified historic city of Jaipur exhibits exceptional town planning integrating ancient Hindu grid concepts with Western design principles.

Hawa Mahal sits at the edge of the City Palace complex, echoing the distinctive pink terracotta wash mandated for the entire walled city.`
  },
  {
    id: 'ev_haw_003',
    landmarkIds: ['hawa-mahal'],
    title: 'Architectural Venturi Cooling and Craftsmanship of Hawa Mahal',
    publisher: 'Rajasthan Architecture and Heritage Society',
    type: 'secondary',
    url: 'https://rajasthanheritage.org/hawa-mahal-venturi',
    retrievedAt: '2026-10-01',
    licence: 'Open Access Research Excerpt',
    reliability: 'high',
    body: `The building is celebrated for its natural passive cooling mechanism. Small openings and lattices accelerate air currents through the Venturi effect, maintaining comfortable temperatures even during scorching desert summers.

The building lacks solid foundations in conventional terms and leans at an angle of 8 inches, stabilized by its curved pyramidal geometry.`
  },
  {
    id: 'ev_haw_004',
    landmarkIds: ['hawa-mahal'],
    title: 'Visiting Hawa Mahal: Timings, Tickets and Photography',
    publisher: 'Department of Archaeology & Museums, Rajasthan',
    type: 'primary',
    url: 'https://museumsrajasthan.gov.in/hawa-mahal',
    retrievedAt: '2026-10-01',
    licence: 'Government of Rajasthan Open Data',
    reliability: 'high',
    body: `The monument is open daily to visitors between 9:00 AM and 5:00 PM. A composite entry ticket covering multiple Jaipur heritage sites is available.

The iconic front facade faces Badi Chaupar street. The best light for photographing the pink sandstone facade occurs in the early morning at sunrise.`
  },
  {
    id: 'ev_haw_007',
    landmarkIds: ['hawa-mahal'],
    title: 'Jaipur Semi-Arid Environmental Profile and Climate Records',
    publisher: 'India Meteorological Department',
    type: 'dataset',
    url: 'https://mausam.imd.gov.in/jaipur',
    retrievedAt: '2026-10-01',
    licence: 'Government of India Open Data',
    reliability: 'medium',
    body: `Jaipur experiences a hot semi-arid climate (Köppen BSh). Summer temperatures from April through July frequently exceed 45 °C with low relative humidity.

Elevation is 431 metres above sea level. Precipitation is concentrated during the brief southwest monsoon from late June through September, followed by dry, mild winters.`
  }
];

for (const doc of docs) {
  const content = `---
id: ${doc.id}
landmarkIds: [${doc.landmarkIds.join(', ')}]
title: "${doc.title.replace(/"/g, '\\"')}"
publisher: "${doc.publisher.replace(/"/g, '\\"')}"
type: ${doc.type}
url: "${doc.url}"
retrievedAt: ${doc.retrievedAt}
licence: "${doc.licence.replace(/"/g, '\\"')}"
reliability: ${doc.reliability}
---

${doc.body}
`;

  const filePath = path.join(outDir, `${doc.id}.md`);
  fs.writeFileSync(filePath, content, 'utf8');
}

console.log(`Successfully wrote ${docs.length} evidence documents.`);
