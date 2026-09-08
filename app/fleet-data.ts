export type WorkbookUser = { locationId: number; location: string; role: number; username: string; name: string; phone: string };
export type WorkbookTelemetry = { IDLocatie: number; DataOra: string; TempC: number; PresAtm: number; Umiditate: number; VitVant: number; DirectieVant: string; RadSolara: number; Turatie: number; Voltaj: number; Amperaj: number; Putere: number; Energie: number; Vibratii: number; CupluMec: number; TempInfas: number; Alarma: number };

// Importat din fișierele Excel furnizate la 03.09.2026.
export const workbookUsers: WorkbookUser[] = [
  {
    "locationId": 1,
    "location": "Comuna Fundeni, jud Calarasi, Romania",
    "role": 2,
    "username": "bogdan@rolix.ro",
    "name": "Bogdan Duran",
    "phone": "0749995555"
  },
  {
    "locationId": 2,
    "location": "Comuna Franceni, jud Constanta, Romania",
    "role": 2,
    "username": "ion.malael@comoti.ro",
    "name": "Ion Malael",
    "phone": "0722559732"
  },
  {
    "locationId": 3,
    "location": "Oras Busteni, jud Prahova, Romania",
    "role": 2,
    "username": "adrian.pandele@arrows.ro",
    "name": "Adrian Pandele",
    "phone": "0748968854"
  },
  {
    "locationId": 4,
    "location": "Comuna Feldioara, jud Sibiu, Romania",
    "role": 2,
    "username": "bogdan.o.duran@gmail.com",
    "name": "Ovidiu Duran",
    "phone": "0749995558"
  },
  {
    "locationId": 5,
    "location": "ADMINISTRATOR",
    "role": 1,
    "username": "dragospreda@yahoo.com",
    "name": "Dragos Preda",
    "phone": "0749998642"
  }
] as WorkbookUser[];
