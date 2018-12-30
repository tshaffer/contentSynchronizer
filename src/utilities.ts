import * as fse from 'fs-extra';
import * as http from 'http';

import * as crypto from 'crypto';

import * as string_decoder from 'string_decoder';
const decoder = new string_decoder.StringDecoder('utf8');

import * as FormData from 'form-data';

import * as isomorphicFetch from 'isomorphic-fetch';

import { FileInfo } from './interfaces';

export function httpUploadFile(hostname: string,
                               endpoint: string,
                               filePath: string,
                               uploadHeaders: any[] = []): Promise<any> {

  return new Promise((resolve, reject) => {
    const url = 'http://' + hostname + ':8080' + endpoint; // TODO this should be a global const

    // TODO get headers should be a utility function
    const headers: any = {};
    uploadHeaders.forEach((uploadHeader) => {
      headers[uploadHeader.key] = uploadHeader.value;
    });

    // TODO get formData should be a utility function
    const formData = new FormData();
    formData.append('files', fse.createReadStream(filePath));
    isomorphicFetch(url, {
      method: 'POST',
      headers,
      body: formData
    }).then((response: any) => {
// TODO this should return response.json(). However, there are currently clients of this function
// which make device api calls that respond with empty or non JSON bodies. These calls should be
// handled through a different function.
      resolve(response);
    }).catch((err: any) => {
      reject(err);
    });
  });
}

export function getFileInfo(filePath: string): Promise<FileInfo> {

  let fileSize = 0;

  return new Promise((resolve) => {
    const hash = crypto.createHash('sha1');
    const input = fse.createReadStream(filePath);
    input.on('readable', () => {
      const data = input.read();
      if (data) {
        hash.update(data);
        fileSize += data.length;
      }
      else {
        const sha1 = hash.digest('hex');
        const fileInfo: FileInfo = {
          filePath,
          sha1,
          size: fileSize
        };
        resolve( fileInfo );
      }
    });
    input.on('error', (err : any) => {
      console.log('getFileInfo error: ', err);
    });
  });
}

export function httpGet(url: string) {
  return new Promise( (resolve, reject) => {
    http.get(url, (res: any) => {

      // consume response body
      res.resume();

      const statusCode = res.statusCode;
      if (statusCode !== 200) {
        return reject(res);
      }
      resolve(res);

    }).on('error', (error: any) => {
      console.error(`httpGet error: ${error.message}`);
      return reject(error);
    });
  });
}

